import {
  Context,
  Contract,
  Info,
  Returns,
  Transaction,
} from "fabric-contract-api";

@Info({
  title: "AcademicCertificateContract",
  description:
    "Smart Contract untuk Penerbitan, Verifikasi, dan Audit Ijazah Digital",
})
export class CertificateContract extends Contract {
  private async certificateExists(ctx: Context, id: string): Promise<boolean> {
    const buffer = await ctx.stub.getState(id);
    return !!buffer && buffer.length > 0;
  }

  /**
   * Menerbitkan Ijazah Baru
   */
  @Transaction()
  public async issueCertificate(
    ctx: Context,
    id: string,
    studentName: string,
    nim: string,
    degree: string,
    ipfsHash: string,
  ): Promise<void> {
    // --- TAHAP 1: PROTEKSI (FAIL-FAST) ---
    // 1. Otorisasi (Hanya Org1MSP)
    const clientMSPID = ctx.clientIdentity.getMSPID();
    if (clientMSPID !== "Org1MSP") {
      throw new Error(
        `AKSES DITOLAK: Instansi ${clientMSPID} tidak memiliki otoritas.`,
      );
    }

    // 2. Validasi Format Dasar
    if (!id || id.length < 5)
      throw new Error("VALIDASI GAGAL: ID Ijazah minimal 5 karakter.");
    if (!studentName)
      throw new Error("VALIDASI GAGAL: Nama mahasiswa wajib diisi.");
    if (!/^\d+$/.test(nim))
      throw new Error("VALIDASI GAGAL: Format NIM harus berupa angka.");
    if (!ipfsHash || ipfsHash.length < 40)
      throw new Error("VALIDASI GAGAL: IPFS Hash tidak valid.");

    // 3. Cek Duplikasi di Ledger
    const exists = await this.certificateExists(ctx, id);
    if (exists)
      throw new Error(`KONFLIK: Ijazah dengan ID ${id} sudah terdaftar.`);

    // --- TAHAP 2: PROSES DATA ---
    const txTimestamp = ctx.stub.getTxTimestamp();
    const issueDate = new Date(
      txTimestamp.seconds.toNumber() * 1000 +
        Math.round(txTimestamp.nanos / 1000000),
    ).toISOString();

    const certificate = {
      docType: "certificate",
      id,
      studentName,
      nim,
      degree,
      ipfsHash,
      issuer: ctx.clientIdentity.getID(),
      issuerOrg: clientMSPID,
      issueDate,
      status: "VALID",
      updatedAt: issueDate,
    };

    // --- TAHAP 3: SIMPAN KE LEDGER ---
    await ctx.stub.putState(id, Buffer.from(JSON.stringify(certificate)));
    console.info(`Ijazah ${id} berhasil diterbitkan.`);
  }

  /**
   * Mencabut Ijazah (Revoke)
   */
  @Transaction()
  public async revokeCertificate(
    ctx: Context,
    id: string,
    reason: string,
  ): Promise<void> {
    // 1. Otorisasi
    if (ctx.clientIdentity.getMSPID() !== "Org1MSP") {
      throw new Error(
        "AKSES DITOLAK: Hanya universitas yang dapat mencabut ijazah.",
      );
    }

    // 2. Cek Keberadaan
    const certBytes = await ctx.stub.getState(id);
    if (!certBytes || certBytes.length === 0) {
      throw new Error(
        `DATA TIDAK DITEMUKAN: Ijazah ID ${id} tidak ada di ledger.`,
      );
    }

    const certificate = JSON.parse(certBytes.toString());

    // 3. Cegah Pencabutan Ganda
    if (certificate.status === "REVOKED") {
      throw new Error(
        `PERINGATAN: Ijazah ID ${id} sudah dalam status dicabut sebelumnya.`,
      );
    }

    // 4. Update Status
    certificate.status = "REVOKED";
    certificate.revocationReason = reason;
    const txTimestamp = ctx.stub.getTxTimestamp();
    certificate.updatedAt = new Date(
      txTimestamp.seconds.toNumber() * 1000,
    ).toISOString();

    await ctx.stub.putState(id, Buffer.from(JSON.stringify(certificate)));
  }

  @Transaction(false)
  @Returns("string")
  public async queryCertificate(
    ctx: Context,
    searchKey: string,
  ): Promise<string> {
    // 1. Cek apakah input adalah ID (Lookup langsung)
    const certBytes = await ctx.stub.getState(searchKey);
    if (certBytes && certBytes.length > 0) {
      return certBytes.toString();
    }

    // 2. Jika bukan ID, cari di Nama atau NIM (Rich Query CouchDB)
    const queryString = {
      selector: {
        docType: "certificate",
        $or: [
          { studentName: { $regex: `(?i)${searchKey}` } }, // (?i) agar tidak sensitif huruf besar/kecil
          { nim: searchKey },
        ],
      },
    };

    const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
    const result = await iterator.next();
    await iterator.close();

    if (!result.value) {
      throw new Error(`Data '${searchKey}' tidak ditemukan.`);
    }

    return result.value.value.toString();
  }

  @Transaction(false)
  public async getCertificateHistory(
    ctx: Context,
    id: string,
  ): Promise<string> {
    const iterator = await ctx.stub.getHistoryForKey(id);
    const results = [];
    let res = await iterator.next();

    while (!res.done) {
      if (res.value) {
        // PERBAIKAN: Menangani timestamp secara lebih aman
        const timestamp = res.value.timestamp;
        const seconds = (timestamp as any).seconds;
        const nanos = (timestamp as any).nanos;

        // Cek apakah seconds perlu dikonversi atau sudah angka
        const secVal =
          typeof seconds === "object"
            ? (seconds as any).toNumber()
            : Number(seconds);
        const ms = secVal * 1000 + Math.round(nanos / 1000000);

        const historyRecord = {
          txId: res.value.txId,
          timestamp: new Date(ms).toISOString(),
          isDelete: res.value.isDelete,
          data: res.value.value.toString()
            ? JSON.parse(res.value.value.toString())
            : null,
        };
        results.push(historyRecord);
      }
      res = await iterator.next();
    }
    await iterator.close();
    return JSON.stringify(results);
  }
}

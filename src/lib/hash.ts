export async function sha256Hex(buf: ArrayBuffer | Uint8Array): Promise<string> {
  const ab = buf instanceof Uint8Array ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) : buf;
  const digest = await crypto.subtle.digest("SHA-256", ab as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function blobToArrayBuffer(blob: Blob): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => reader.result ? resolve(new Uint8Array(reader.result as ArrayBuffer)) : reject(new Error(`Result was null`));
      reader.readAsArrayBuffer(blob);
    });
}

import { type Zippable, zip } from "fflate";
import { DownloadableFile, ExtendedFileWithContent } from "./constants";

export function blobToArrayBuffer(blob: Blob): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => reader.result ? resolve(new Uint8Array(reader.result as ArrayBuffer)) : reject(new Error(`Result was null`));
      reader.readAsArrayBuffer(blob);
    });
}

export function asyncCreateZip(zipDirectory: Zippable): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(zipDirectory, (err, data) => {
      if (err) return reject(err);
      return resolve(data);
    });
  });
}

export async function getSaveFiles(
  filesWithBlobs: ExtendedFileWithContent[],
  filename: string
): Promise<DownloadableFile> {
  
  if (filesWithBlobs.length === 1) {
    // one file should be individually downloaded without being zipped
    const file = filesWithBlobs[0];
    const fileWithoutMain = file.path.replace(`${filename}/`, '') || "downloaded.txt";
    return { filename: fileWithoutMain, content: file.blob };
  }

  // multiple files, create a zip file
  const zipDirectory = {} as Zippable;
  for (const file of filesWithBlobs) {
    const filePath = file.path.replace(`${filename}/`, '')
    zipDirectory[filePath] = await blobToArrayBuffer(file.blob);
  }

  const zipped = await asyncCreateZip(zipDirectory);

  return { content: zipped, filename: `${filename}.zip` };
}
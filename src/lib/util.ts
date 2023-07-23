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
    const fileWithoutMain = file.relativePath;
    return { filename: fileWithoutMain, content: file.blob };
  }

  // multiple files, create a zip file
  const zipDirectory = {} as Zippable;
  for (const file of filesWithBlobs) {
    zipDirectory[file.relativePath] = await blobToArrayBuffer(file.blob);
  }

  const zipped = await asyncCreateZip(zipDirectory);

  return { content: zipped, filename: `${filename}.zip` };
}

/**
 * Chunk a array
 * from lodash.chunk
 */
export const chunkArray = <T>(InitialArray: T[], sizePerArray = 1) => {
  // just safety incase we pass in a negative value by accident
  sizePerArray = Math.max(sizePerArray, 0)
  if(!InitialArray.length || !Array.isArray(InitialArray)) return [];
  const chunked = new Array<T[]>();
  // track the current chunk
  let chunkIndex = 0;
  let index = 0;
  for(;index < InitialArray.length;) {
    chunked[chunkIndex++] = InitialArray.slice(index, (index += sizePerArray))
  }

  return chunked;
}
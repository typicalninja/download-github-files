import { useSearchParams } from "react-router-dom";
import {
    fetchDirectoryViaTrees,
  fetchFileContent,
  fetchRepo,
  parseGithubResolver,
} from "../lib/github";
import {
  Flex,
  Text,
  Table,
  Skeleton,
  Loader,
  Anchor,
  Divider,
  Button,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useState } from "react";

import { AiOutlineClose, AiOutlineCheck, AiOutlineWarning, AiOutlineCloudDownload } from "react-icons/ai";

// utils
import {
  AppStates,
  File,
  ExtendedFileWithContent,
  GithubRepo,
  ResolvedGithubData,
  DownloadableFile,
} from "../lib/constants";
import { blobToArrayBuffer } from "../lib/util";

import DownloaderInfoComponent from "../components/DownloaderInfo";

// file related
import saveFile from "save-file";
import  { zip, type Zippable } from 'fflate'

// perf
import pMap from 'p-map';
import pRetry from 'p-retry';

/**
 * Lifecycle to get repo data
 * @param username
 * @param repo
 * @returns
 */
async function LifeCycleGetRepoData({ username, repo }: ResolvedGithubData) {
  notifications.show({
    id: "repo-load",
    title: "Please wait",
    message: `Requesting repo ${username}/${repo}`,
    loading: true,
    withCloseButton: false,
    autoClose: false,
    color: "yellow.3",
  });

  try {
    const result = await fetchRepo(username, repo);
    notifications.hide("repo-load");
    console.log(`LifeCycleGetRepoData: success`);
    return result;
  } catch (err) {
    console.log(`LifeCycleGetRepoData: Failed`, err);
    notifications.update({
      id: "repo-load",
      title: "Repo discovery Failed",
      message: (err as Error).message || "Unknown Error",
      loading: false,
      withCloseButton: true,
      autoClose: false,
      color: "red",
      icon: <AiOutlineClose />,
    });
    return null;
  }
}

/**
 * Fetch the file list for provided dir
 * @param param0
 * @returns
 */
async function LifeCycleFetchFiles(resolved: ResolvedGithubData): Promise<File[]> {
  // blobs are just files direct
  if (resolved.type === "blob") return [{ dir: resolved.dir, downloaded: false, failed: false }];
  else {
    const files = await fetchDirectoryViaTrees(resolved)
    return files;
  }
}

/**
 * Download the files fetched
 * @param files
 * @param param1
 * @returns
 */
async function LifeCycleDownloadFiles(
  files: File[],
  { username, repo, branch }: ResolvedGithubData
): Promise<ExtendedFileWithContent[]> {
  const fileData: ExtendedFileWithContent[] = [];
  const fetchFile = async (file: File) => {
    const fileContent = { ...file } as ExtendedFileWithContent;
    try {
     // const data = await fetchFileContent(username, repo, branch, file.dir);
      const data = await pRetry(() => fetchFileContent(username, repo, branch, file.dir), { retries: 4 })
      console.log(`Download successful for file: ${file.dir}`);
      fileContent.blob = data;
      fileContent.downloaded = true;
    } catch (err) {
      fileContent.failed = true;
      console.log(`Download Failed for directory: ${file.dir}`, err);
      notifications.show({
        message: `File ${file.dir} failed to download`,
        color: "red",
      });
    }
    fileData.push(fileContent);
  }
  
  await pMap(files, fetchFile, { concurrency: 20 });
  return fileData;
}


async function LifeCycleSaveFiles(filesWithBlobs: ExtendedFileWithContent[], filename: string): Promise<DownloadableFile> {
    if(filesWithBlobs.length === 1) {
        // one file should be individually downloaded without being zipped
        const file = filesWithBlobs[0];
        const fileWithoutMain = file.dir.split('/').slice(1).join('/') || file.dir;
        await saveFile(file.blob, fileWithoutMain)
        return { filename: fileWithoutMain, content: file.blob };
    }
    const zipDirectory = {} as Zippable
    for(const file of filesWithBlobs) {
        const dir = file.dir.split('/').slice(1).join('/')
        zipDirectory[dir] = await blobToArrayBuffer(file.blob)
    }
    function asyncCreateZip(): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            zip(zipDirectory, (err, data) => {
                if(err) return reject(err);
                return resolve(data)
            })
        })
    }
    const zipped = await asyncCreateZip()
    await saveFile(zipped, `${filename}.zip`)

    return { content: zipped, filename: `${filename}.zip`};
}

/** Main */
export default function DownloadPage() {
  const [searchParams] = useSearchParams();
  // holds current repo data
  const [state, setState] = useState<AppStates>(AppStates.Starting);
  const [repoInfo, setRepoInfo] = useState<null | GithubRepo>(null);
  // holds current file data
  const [fileInfo, setFileInfo] = useState<File[]>([]);
  const [downloadableFile, setDownloadable] = useState<DownloadableFile | null>(null);

  const postDownload = () => { if(downloadableFile) { void saveFile(downloadableFile.content, downloadableFile.filename).then(() => console.log(`Manual download done`)); }}

  const resolved = parseGithubResolver(searchParams.get("resolve") as string);
  // resolver failed, error
  if (!resolved)
    throw new TypeError(
      `Failed to resolve url, must match format: /username/repo/[tree | blob]/(branch)/[folder | file.js]`
    );

  const Lifecycle = useCallback(async () => {
    if(state === AppStates.Finished) return;
    const repoDataLifeCycle = await LifeCycleGetRepoData(resolved);
    if (!repoDataLifeCycle) return;
    // result was found continue
    setRepoInfo(repoDataLifeCycle);

    // find files
    const fetchFilesLifeCycle = await LifeCycleFetchFiles(resolved);
    if (!fetchFilesLifeCycle.length) {
      notifications.show({
        title: "Empty files",
        message: "There are no Files to download",
        withCloseButton: true,
        autoClose: false,
        color: "red",
        icon: <AiOutlineClose />,
      });
      return;
    } else if(fetchFilesLifeCycle.length > 50) {
        notifications.show({
            title: "Hang on tight!",
            message: `Large repository found, ${fetchFilesLifeCycle.length} files for download. This may take some time`,
            withCloseButton: true,
            autoClose: false,
            color: "orange",
            icon: <AiOutlineWarning />,
          });
    }


    console.log(`LifeCycleFetchFiles: success`, fetchFilesLifeCycle);
    setFileInfo(fetchFilesLifeCycle);
    setState(AppStates.Downloading);

    const downloadedFiles = await LifeCycleDownloadFiles(
      fetchFilesLifeCycle,
      resolved
    );

    console.log(`LifeCycleDownloadFiles: Success`);
    setFileInfo(
      downloadedFiles.map((c) => ({
        dir: c.dir,
        downloaded: c.downloaded,
        failed: c.failed,
      }))
    );
    setState(AppStates.Zipping);

    // the folder name
    const folderName = resolved.dir.split('/')[0]
    const downloadable = await LifeCycleSaveFiles(downloadedFiles, folderName);
    // download after initial
    setDownloadable(downloadable);
    setState(AppStates.Finished);

    notifications.show({
        title: `You download is complete`,
        message: `Successfully Downloaded ${downloadedFiles.length} file(s)`,
        color: 'teal',
        icon: <AiOutlineCheck />
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Lifecycle().catch(() => {
      /** No error expected */
    });
  }, [Lifecycle]);

  return (
    <Flex direction="column" gap="md">
      {repoInfo !== null ? (
        <DownloaderInfoComponent
          resolvedData={resolved}
          githubData={repoInfo}
          fileLength={fileInfo.length}
        />
      ) : (
        <Loader />
      )}
      <Divider />
      <Button leftIcon={<AiOutlineCloudDownload />} variant="outline" disabled={!(downloadableFile)} onClick={postDownload}>{downloadableFile ? `Download ${downloadableFile.filename}` : 'Download not ready'}</Button>
      <Table highlightOnHover withBorder withColumnBorders>
        <thead>
          <tr>
            <th>No</th>
            <th>File location</th>
            <th>Downloaded</th>
          </tr>
        </thead>
        <tbody>
          {fileInfo.length <= 0 && (
            <tr>
              <td>
                <Skeleton height={8} mt={6} width="70%" radius="xl" />
              </td>
              <td>
                <Skeleton height={8} mt={6} width="70%" radius="xl" />
              </td>
              <td>
                <Skeleton height={8} mt={6} width="70%" radius="xl" />
              </td>
            </tr>
          )}
          {fileInfo.map((file, i) => (
            <tr key={i}>
              <td>{i}</td>
              <td>
                <Anchor
                  target="_blank"
                  href={`https://github.com/${resolved.username}/${resolved.repo}/blob/${resolved.branch}/${resolved.dir}`}
                >
                  {file.dir}
                </Anchor>
              </td>
              <td>
                {state === AppStates.Downloading && !file.downloaded && (
                  <Loader />
                )}
                {state === AppStates.Finished && file.downloaded && (
                  <Text fw={500} color="green">
                    <AiOutlineCheck /> Downloaded
                  </Text>
                )}
                {state === AppStates.Zipping && file.downloaded && (
                  <Text fw={500} color="teal.8">
                    <AiOutlineCheck /> Zipping
                  </Text>
                )}
                {file.failed && (
                  <Flex align="center">
                    <AiOutlineClose /> <Text fw={500} c="red">Error downloading</Text>
                  </Flex>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Flex>
  );
}

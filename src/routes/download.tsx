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
  Loader,
  Anchor,
  Divider,
  Button,
  Center,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";

// icons
import {
  AiOutlineClose,
  AiOutlineCheck,
  AiOutlineWarning,
  AiOutlineCloudDownload,
} from "react-icons/ai";

// utils
import {
  AppStates,
  File,
  ExtendedFileWithContent,
  GithubRepo,
  ResolvedGithubData,
  DownloadableFile,
} from "../lib/constants";
import { getSaveFiles } from "../lib/util";

import DownloaderInfoComponent from "../components/DownloaderInfo";

// file related
import saveFile from "save-file";

// perf
import pMap from "p-map";
import pRetry from "p-retry";
import { SettingsManager } from "../lib/Settings";

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
    color: "yellow",
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
async function LifeCycleFetchFiles(
  resolved: ResolvedGithubData
): Promise<File[]> {
  // blobs are just files direct
  if (resolved.type === "blob")
    return [{ dir: resolved.dir, downloaded: false, failed: false }];
  else {
    const filesData = await fetchDirectoryViaTrees(resolved);
    let files = filesData.fileList;
    // truncated means repo is too large and these files are not available through trees Api
    if (filesData.truncated && !files.length) {
      notifications.show({
        title: "Too large!",
        message: `Large repository found, truncated result obtained. attempting download via content api`,
        withCloseButton: true,
        autoClose: false,
        color: "orange",
        icon: <AiOutlineWarning />,
      });
      console.log(
        `Repository is too large, attempting to download via content Api`
      );
      files = [];
    }

    if (!files.length) {
      notifications.show({
        title: "Empty files",
        message: "There are no Files to download",
        autoClose: false,
        color: "red",
        icon: <AiOutlineClose />,
      });
      return [];
    } else if (files.length > 50) {
      notifications.show({
        title: "Hang on tight!",
        message: `Large Directory found, ${files.length} files for download. This may take some time`,
        withCloseButton: true,
        autoClose: false,
        color: "orange",
        icon: <AiOutlineWarning />,
      });
    }

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
      const data = await pRetry(
        () => fetchFileContent(username, repo, branch, file.dir),
        { retries: 4 }
      );
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
  };

  await pMap(files, fetchFile, { concurrency: 20 });
  return fileData;
}

/** Main */
export default function DownloadPage() {
  const [searchParams] = useSearchParams();
  // holds current repo data
  const [state, setState] = useState<AppStates>(AppStates.Idle);
  const [repoInfo, setRepoInfo] = useState<null | GithubRepo>(null);
  // holds current file data
  const [fileInfo, setFileInfo] = useState<File[]>([]);
  const [downloadableFile, setDownloadable] = useState<DownloadableFile | null>(
    null
  );

  const savePackedFiles = () => {
    if (downloadableFile) {
      void saveFile(downloadableFile.content, downloadableFile.filename).then(
        () => console.log(`Manual download done`)
      );
    }
  };

  const resolved = parseGithubResolver(searchParams.get("resolve") as string);
  // resolver failed, error
  if (!resolved)
    throw new TypeError(
      `Failed to resolve url, must match format: /username/repo/[tree | blob]/(branch)/[folder | file.js]`
    );

  // run on start
  useEffect(() => {
    // if idle fetch all files and repo data
    if (state === AppStates.Idle) {
      // on start get repo data
      void LifeCycleGetRepoData(resolved).then((repoData) => {
        setRepoInfo(repoData);
        // file data is also fetched on start
        // check if repo data was successfully fetched if not might indicate that we should
        // not continue requesting data (ratelimit)
        if (repoData)
          void LifeCycleFetchFiles(resolved).then((files) => {
            setFileInfo(files);
            if (files.length) {
              // set state to starting so the download button appears or immediately download if set to setting
              setState(SettingsManager.isSetting('downloaderMode', ['autoFetchAnDownload', 'autoSave']) ? AppStates.Downloading : AppStates.Starting);
            }
          });
      });
    }
    // if state changed to downloading then download must begin
    else if (state === AppStates.Downloading) {
      if (fileInfo.length <= 0)
        return notifications.show({
          message: `No Files available to be downloaded`,
        });
      console.log(`Downloading`);
      void LifeCycleDownloadFiles(fileInfo, resolved).then(
        (downloadedFiles) => {
          setFileInfo(
            downloadedFiles.map((c) => ({
              dir: c.dir,
              downloaded: c.downloaded,
              failed: c.failed,
            }))
          );
          setState(AppStates.Zipping);
          const folderName = resolved.dir.split("/")[0];
          // convert the files into savable files
          void getSaveFiles(downloadedFiles, folderName).then(
            (downloadable) => {
              setDownloadable(downloadable);
              notifications.show({
                title: `You download is complete`,
                message: `Successfully Downloaded ${downloadedFiles.length} file(s), Click Download to finish`,
                color: "teal",
                icon: <AiOutlineCheck />,
              });
              setState(AppStates.Finished);

              if(SettingsManager.isSetting('downloaderMode', ['autoSave'])) {
                void saveFile(downloadable.content, downloadable.filename).then(() => {
                  console.log('Auto downloaded')
                })
              }
            }
          );
        }
      );
    }
  }, [state, fileInfo]);

  return (
    <Flex direction="column" gap="md">
      {/** Info panel */}
      {repoInfo !== null ? (
        <DownloaderInfoComponent
          resolvedData={resolved}
          githubData={repoInfo}
          fileLength={fileInfo.length}
        />
      ) : (
        <Center>
          <Loader variant="bars" />
        </Center>
      )}
      <Divider />
      {/** Controls */}
      <Flex gap="md">
        <Button
          leftIcon={<AiOutlineCloudDownload />}
          variant="outline"
          disabled={!downloadableFile}
          onClick={savePackedFiles}
        >
          {downloadableFile
            ? `Download Packed ${downloadableFile.filename}`
            : "Download not ready"}
        </Button>
        {state === AppStates.Starting && (
          <Button
            leftIcon={<AiOutlineCloudDownload />}
            variant="light"
            onClick={() => setState(AppStates.Downloading)}
            disabled={!fileInfo.length}
          >
            {fileInfo.length
              ? `Fetch All ${fileInfo.length} Files`
              : "No Files to Fetch"}
          </Button>
        )}
      </Flex>
      <Divider />
      {/** Data panel */}
      <Table highlightOnHover withBorder withColumnBorders>
        <thead>
          <tr>
            <th>No</th>
            <th>File location</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {fileInfo.map((file, i) => (
            <tr key={i}>
              <td>{i}</td>
              <td>
                <Anchor
                  target="_blank"
                  href={`https://github.com/${resolved.username}/${resolved.repo}/blob/${resolved.branch}/${file.dir}`}
                >
                  {file.dir}
                </Anchor>
              </td>
              <td>
                {state === AppStates.Starting && !file.downloaded && (
                  <Text fw={500} color="yellow">
                    <Loader size="md" variant="dots" color="yellow" /> Waiting
                    (Click Fetch to start)
                  </Text>
                )}
                {state === AppStates.Downloading && !file.downloaded && (
                  <Text fw={500} color="violet">
                    <Loader color="violet" variant="dots" /> Downloading
                  </Text>
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
                    <AiOutlineClose />{" "}
                    <Text fw={500} c="red">
                      Error downloading
                    </Text>
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

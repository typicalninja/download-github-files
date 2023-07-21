import { useSearchParams } from "react-router-dom";
import {
  fetchFileContent,
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
import { useEffect, useMemo, useState } from "react";

// icons
import {
  AiOutlineClose,
  AiOutlineCheck,
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
import { RepositoryDownloader } from "../lib/gh";
import { ErrorNotification, SuccessNotification, WarningNotification } from "../lib/notifications";

/**
 * Download the files fetched
 * @param files
 * @param param1
 * @returns
 */
async function LifeCycleDownloadFiles(
  files: File[],
  repo: GithubRepo,
  resolved: ResolvedGithubData
): Promise<ExtendedFileWithContent[]> {
  const fileData: ExtendedFileWithContent[] = [];
  const fetchFile = async (file: File) => {
    const fileContent = { ...file } as ExtendedFileWithContent;
    try {
      // const data = await fetchFileContent(username, repo, branch, file.dir);
      const data = await pRetry(() => fetchFileContent(repo, resolved, file), {
        retries: 4,
      });
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

  const downloader = useMemo(
    () => new RepositoryDownloader(searchParams.get("resolve") as string),
    [searchParams]
  );

  useEffect(() => {
    // if blob (file) error, cannot directly download blob types
    if (downloader.resolved?.type === "blob")
      throw new Error(
        `Downloading of Individual files is not supported. Github Already support this feature`
      );
    // handle Idle Phase
    if (state === AppStates.Idle) {
      downloader
        .fetchRepo()
        .then((info) => {
          setRepoInfo(info);

          // once repo is fetched fetch all the files in repo
          // fetch strategy will be decided in the downloader
          downloader
            .fetchFiles()
            .then((files) => {
              setFileInfo(files);
              // file discovery was successful
              if(files.length) {
                setState(downloader.SettingsManager.isSetting('downloaderMode', ['autoFetchAnDownload', 'autoSave']) ? AppStates.Downloading : AppStates.Starting);
                if(files.length > 100) {
                  WarningNotification(`${files.length} Files found, this may take a while`, 'Large Directory Detected', 6000)
                }
                else SuccessNotification(`${files.length} File(s) Found, Ready to fetch`, 'File Discovery Success', 5000)
              }
            })

            // handle fileDiscover Errors
            .catch((err) =>
              ErrorNotification(
                (err as Error).message,
                "File Discovery Error",
                true
              )
            );
        })
        // catch RepoDiscovery errors
        .catch((err) =>
          ErrorNotification(
            (err as Error).message,
            "Repository Discovery Error",
            true
          )
        );
    }
    // handle download phase
    else if(state === AppStates.Downloading) {

    }
  }, [downloader, state]);

  /* const savePackedFiles = () => {
    if (downloadableFile) {
      void saveFile(downloadableFile.content, downloadableFile.filename).then(
        () => console.log(`Manual download done`)
      );
    }
  };*/

  /*  const resolved = parseGithubResolver(searchParams.get("resolve") as string);
  // resolver failed, error
  if (!resolved)
    throw new TypeError(
      `Failed to resolve url, must match format: /username/repo/[tree | blob]/(branch)/[folder | file.js]`
    );*/

  // run on start
  /* useEffect(() => {
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
      if(!repoInfo) throw new Error(`Internal Error, Repo is not discovered yet!`)
      if (fileInfo.length <= 0)
        return notifications.show({
          message: `No Files available to be downloaded`,
        });
      console.log(`Downloading`);
      void LifeCycleDownloadFiles(fileInfo, repoInfo, resolved).then(
        (downloadedFiles) => {
          if(!downloadedFiles.length) return notifications.show({ title: `Download failed`, message: `Check console for more details, file a bug report if your sure this is not intended`, color: 'red' })
          setFileInfo(
            downloadedFiles.map((c) => ({
              dir: c.dir,
              url: c.url,
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
  }, [state, fileInfo]);*/

  return (
    <Flex direction="column" gap="md">
      {/** Info panel */}
      {downloader.resolved !== null && repoInfo ? (
        <DownloaderInfoComponent
          resolvedData={downloader.resolved}
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
                  href={`https://github.com/${downloader.resolved.username}/${downloader.resolved.repo}/blob/${downloader.resolved.branch}/${file.path}`}
                >
                  {file.path}
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

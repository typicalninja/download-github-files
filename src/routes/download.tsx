import { useSearchParams } from "react-router-dom";
import {
  Flex,
  Text,
  Table,
  Loader,
  Anchor,
  Divider,
  Button,
  Pagination,
  TextInput
} from "@mantine/core";
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
  GithubRepo,
  DownloadableFile,
} from "../lib/constants";
import { chunkArray, getSaveFiles } from "../lib/util";
import prettyBytes from 'pretty-bytes';

import DownloaderInfoComponent from "../components/DownloaderInfo";

// file related
import saveFile from "save-file";


import { SettingsManager } from "../lib/Settings";
import { RepositoryDownloader } from "../lib/github";

import {
  ErrorNotification,
  SuccessNotification,
  WarningNotification,
} from "../lib/notifications";


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
  const [animationsEnabled, setanimationsEnabled] = useState<boolean>(
    true
  );

  const [chunkPage, setPage] = useState(0)
  const chunkedFiles = useMemo(() => chunkArray<File>(fileInfo, 5), [fileInfo])
  const currentFiles = useMemo(() => chunkedFiles[chunkPage - 1] || [], [chunkPage, chunkedFiles]);

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
              if (files.length) {
                setState(
                  downloader.SettingsManager.isSetting("downloaderMode", [
                    "autoFetchAnDownload",
                    "autoSave",
                  ])
                    ? AppStates.Downloading
                    : AppStates.Starting
                );
                if (files.length > 100) {
                  setanimationsEnabled(false)
                  WarningNotification(
                    `${files.length} Files found, this may take a while`,
                    "Large Directory Detected",
                    6000
                  );
                } else
                  SuccessNotification(
                    `${files.length} File(s) Found, Ready to fetch`,
                    "File Discovery Success",
                    5000
                  );
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
    else if (state === AppStates.Downloading) {
      void downloader.bulkDownloadFiles(fileInfo).then((downloaded) => {
        setFileInfo(
          downloaded.map((c) => ({
            path: c.path,
            url: c.url,
            downloaded: c.downloaded,
            size: c.size
          }))
        );
        setState(AppStates.Zipping);
        void getSaveFiles(
          downloaded,
          `${downloader.resolved?.folder || "downloaded"}`
        ).then((downloadableFile) => {
          setDownloadable(downloadableFile);
          setState(AppStates.Finished);
          if (SettingsManager.isSetting("downloaderMode", ["autoSave"])) {
            void saveFile(
              downloadableFile.content,
              downloadableFile.filename
            ).then(() => {
              console.log("Auto downloaded");
            });
          }
        });
      });
    }
  }, [downloader, state]);

  const savePackedFiles = () => {
    if (downloadableFile) {
      void saveFile(downloadableFile.content, downloadableFile.filename).then(
        () => console.log(`Manual download done`)
      );
    }
  };

  return (
    <Flex direction="column" gap="md">
      {/** Info panel */}
      <DownloaderInfoComponent
          resolvedData={downloader.resolved}
          githubData={repoInfo}
          loading={!(downloader.resolved !== null && repoInfo)}
          files={{ count: fileInfo.length, size: fileInfo.reduce((a, b) => a + b.size, 0)}}
      />
      <Divider />
      {/** Controls */}
      <Flex maw={500} gap="md" align="center">
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
        <TextInput />
      </Flex>
      <Divider />
      {/** Data panel */}
      <Flex direction="column" align="center" gap="md">
      <Table highlightOnHover withBorder withColumnBorders>
        <thead>
          <tr>
            <th>File location</th>
            <th>Size</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {currentFiles.map((file, i) => (
            <tr key={i}>
              <td>
                <Anchor
                  target="_blank"
                  href={`https://github.com/${
                    downloader?.resolved?.username || ""
                  }/${downloader?.resolved?.repo || ""}/blob/${
                    downloader?.resolved?.branch || ""
                  }/${file.path}`}
                >
                  {file.path.replace(`${downloader.resolved?.directory as string}/`, '')}
                </Anchor>
              </td>
              <td>{prettyBytes(file.size)}</td>
              <td>
                {state === AppStates.Starting && !file.downloaded && (
                  <Text fw={500} color="yellow">
                    {animationsEnabled && <Loader size="md" variant="dots" color="yellow" />} Waiting
                    (Click Fetch to start)
                  </Text>
                )}
                {state === AppStates.Downloading && !file.downloaded && (
                  <Text fw={500} color="violet">
                    {animationsEnabled && <Loader color="violet" variant="dots" />} Downloading
                  </Text>
                )}
                {state === AppStates.Finished && (file.downloaded ? (
                  <Text fw={500} color="green">
                    <AiOutlineCheck /> Downloaded
                  </Text>
                ) : (
                <Text fw={500} c="red">
                  <AiOutlineClose />{" "}
                  Error downloading
                </Text>
                ))}
                {state === AppStates.Zipping && (file.downloaded ? (
                  <Text fw={500} color="teal.8">
                    <AiOutlineCheck /> Zipping
                  </Text>
                ): (
                  <Text fw={500} c="red">
                    <AiOutlineClose />{" "}
                    Error downloading
                </Text>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination onChange={setPage} total={chunkedFiles.length} />
      </Flex>
    </Flex>
  );
}

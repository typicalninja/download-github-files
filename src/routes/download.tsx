import { useSearchParams } from "react-router-dom";
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
import { getSaveFiles } from "../lib/util";

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
            failed: c.failed,
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
                  href={`https://github.com/${
                    downloader?.resolved?.username || ""
                  }/${downloader?.resolved?.repo || ""}/blob/${
                    downloader?.resolved?.branch || ""
                  }/${file.path}`}
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

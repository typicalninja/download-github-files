import DownloaderSettingsManager, { SettingsManager } from "./Settings";
import { GithubRepo, ResolvedRepoData, File, ExtendedFileWithContent, GithubUser } from "./constants";
import { ErrorNotification, WarningNotification } from "./notifications";
import pMap from "p-map";
import pRetry from "p-retry";

/**
 * Due to how our class is structured this is a must
 * @returns 
 */
export const fetchCurrentTokenUser = async (): Promise<GithubUser> => {
  const token = SettingsManager.getSetting("token");
  const tokenEnabled =
  token &&
  SettingsManager.isSetting("tokenEnabled", [true]);

  if(!tokenEnabled) throw new Error(`Token is not present or is disabled`);
  const request = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}` } });
  if(!request.ok) throw new Error(`Token is Invalid received code ${request.status}`)
  const json = await request.json() as GithubUser;
  return json;
}

/** Temp file */
export class RepositoryDownloader {
  resolved: ResolvedRepoData | null;
  SettingsManager: DownloaderSettingsManager;
  repo: GithubRepo | null;
  /**
   *
   * @param resolve resolver url returned from the ?resolve parameter
   */
  constructor(resolve: string) {
    this.resolved = RepositoryDownloader.parseResolveUrl(resolve);
    // if nothing can be resolved error
    if (!this.resolved)
      throw new TypeError(
        `Invalid Url path, Must follow format: [/username/repositoryName/tree/branch/folder`
      );
    this.SettingsManager = SettingsManager;
    this.repo = null;
  }
  /**
   * Short utility to fetch a api resource with or without a api token
   * @param url
   * @param useToken
   * @returns
   */
  getUrl(url: string, useToken = true) {
    const token = this.SettingsManager.getSetting("token");
    const tokenEnabled =
      token &&
      this.SettingsManager.isSetting("tokenEnabled", [true]) &&
      useToken;
    console.log(tokenEnabled)
    return fetch(
      url,
      tokenEnabled ? { headers: { Authorization: `Bearer ${token}` } } : {}
    );
  }
  /**
   * Use for public repo does not require a token
   */
  async downloadPublicFile(fileDir: string) {
    if (!this.resolved) throw new Error(`Invalid Repository provided`);
    const { username, repo, branch } = this.resolved;
    const response = await fetch(
      `https://raw.githubusercontent.com/${username}/${repo}/${branch}/${fileDir}`
    );
    if (!response.ok) {
      throw new Error(
        `Api Error of "${response.statusText}" while Downloading public file ${fileDir}`
      );
    }
    return response.blob();
  }
  async downloadPrivateFile(file: File) {
    const response = await this.getUrl(file.url);
    if (!response.ok) {
        throw new Error(`Api Error of "${response.statusText}" while downloading private file ${file.path}`);
    }
    const {content} = await response.json() as { content: string };
    // idea by https://github.com/download-directory/download-directory.github.io/
    const decoder = await fetch(`data:application/octet-stream;base64,${content}`);
    return decoder.blob();
  }
  /**
   * Download a file
   * Uses the appropriate method for this repo
   * @param file 
   * @returns 
   */
  async downloadFile(file: File) {
    if (this.repo?.private) return await this.downloadPrivateFile(file)
    else return await this.downloadPublicFile(file.path);
  }

  /**
   * Bulk downloads Files concurrently
   */
  async bulkDownloadFiles(files: File[]): Promise<ExtendedFileWithContent[]> {
    const fileData: ExtendedFileWithContent[] = [];

    // small mapper function for pMap
    const downloadContent = async (file: File) => {
        const fileContent = { ...file } as ExtendedFileWithContent
        console.log(`BulkDownload: Downloading file ${file.path}`)
        try {
            const data = await pRetry(() => this.downloadFile(file), {
                retries: 3,
            });
            console.log(`BulkDownload: Download of file ${file.path} Success`)
            fileContent.downloaded = true;
            fileContent.blob = data;
        }
        catch(err) {
            console.log(`BulkDownload: Download of file ${file.path} Failed @`, err)
            ErrorNotification(`File ${file.path} Failed to download (Check console)`, 'File Failed to download', false)
        }
        fileData.push(fileContent);
    }

    await pMap(files, downloadContent, { concurrency: 20 });
    return fileData;
  }
  /**
   * Fetch via contents api
   * Multiple requests,
   * suitable for large repository
   *
   */
  async fetchViaContentsApi(subDirectory?: string) {
    if (!this.resolved) throw new Error(`Invalid Repository provided`);
    const files: File[] = [];
    const additionalRequests: string[] = [];

    const { username, repo, branch, directory } = this.resolved;

    console.log(
      `Fetching ${username}/${repo}/contents/${
        subDirectory || directory
      } [VIA CONTENTS API]`
    );
    const response = await this.getUrl(
      `https://api.github.com/repos/${username}/${repo}/contents/${
        subDirectory || directory
      }?ref=${branch}`
    );

    if (!response.ok) {
      throw new Error(
        `Api Error ${response.status} While Discovering of Files in ${username}/${repo} [Via Content API]`
      );
    }

    const jsonResponse = (await response.json()) as
      | {
          message?: string;
        }
      | { name: string; path: string; git_url: string; type: "dir" | "file"; size: number }[];

    if (!Array.isArray(jsonResponse)) {
      // json is a object
      if (jsonResponse.message) {
        if (jsonResponse.message === "Not Found")
          throw new Error(
            `API Returned Not found error on file Discovery of ${username}/${repo}/${directory}`
          );
        else
          throw new Error(
            `Unknown Api Error "${jsonResponse.message}" on file Discovery of ${username}/${repo}/${directory}`
          );
      }
    } else {
      for (const item of jsonResponse) {
        if (item.type === "file") {
          files.push({
            path: item.path,
            url: item.git_url,
            downloaded: false,
            size: item.size,
            relativePath: item.path.replace(
              `${this.resolved.directory}/`,
              ""
            )
          });
        } else if (item.type === "dir") {
          additionalRequests.push(item.path);
        }
      }
    }
    const requestResult = await pMap(
      additionalRequests,
      this.fetchViaContentsApi.bind(this),
      { concurrency: 5 }
    );
    const flatFiles: File[] = requestResult.flat();
    return files.concat(flatFiles);
  }
  /**
   * Fetches file via the Tree api
   * Uses 1 api call
   * Not reliable for large repository
   */
  async fetchViaTreeApi() {
    if (!this.resolved) throw new Error(`Invalid Repository provided`);
    const files: File[] = [];
    const { username, repo, branch } = this.resolved;
    const response = await this.getUrl(
      `https://api.github.com/repos/${username}/${repo}/git/trees/${branch}?recursive=1`
    );

    if (!response.ok) {
      switch (response.status) {
        case 404:
          throw new Error(`Repository or User could not be found`);
        case 429:
        case 403: {
          const header = response.headers.get("x-ratelimit-reset");
          throw new Error(
            `Ip or token is rate limited, Reset on ${new Date(
              Number(header as string) * 1000
            ).toISOString()}`
          );
        }
        case 401:
          throw new Error(`Authentication Token is Expired or invalid`);
        default:
          if (!response.ok)
          throw new Error(
            `Api Error ${response.status} While Discovering of Files in ${username}/${repo}`
          );
      }
    }

    const json = (await response.json()) as {
      message?: string;
      tree: { path: string; type: string; url: string; size: number }[];
      truncated: boolean;
    };

    if (json.message) {
      throw new Error(
        `Api Returned error "${json.message}" While Discovering of files in ${username}/${repo}`
      );
    }

    for (const item of json.tree) {
      if (
        item.type === "blob" &&
        item.path.startsWith(this.resolved.directory)
      ) {
        files.push({
          path: item.path,
          url: item.url,
          downloaded: false,
          size: item.size,
          relativePath: item.path.replace(
            `${this.resolved.directory}/`,
            ""
          )
        });
      }
    }

    return {
      fileList: files,
      truncated: json.truncated,
    };
  }
  /**
   * Fetch the files provided path provides
   */
  async fetchFiles() {
    if (!this.repo) throw new Error(`Repo not initialized`);
    const filesData = await this.fetchViaTreeApi();
    let files = filesData.fileList;

    if (filesData.truncated && !files.length) {
      // send a warning
      WarningNotification(
        "Large Repository found (Api returned truncated data), Attempting to retrieve full data from content api",
        "Hang on tight!",
        7000
      );
      files = await this.fetchViaContentsApi();
    }

    if (!files.length) {
      ErrorNotification(
        "This directory is Empty",
        "Why is it empty here?",
        false
      );
    }

    return files;
  }
  /**
   * Fetch the current repository
   * @returns
   */
  async fetchRepo(): Promise<GithubRepo> {
    if (!this.resolved) throw new Error(`Invalid Repository provided`);
    const { username, repo, branch } = this.resolved;
    // obtain cached repos
    const ls = localStorage.getItem(
      `cache:repo:/${username}/${repo}/${branch}`
    );
    // we assume the cache is valid json and proceed with parsing
    // if someone had messed with the cache (this might crash so a catch is used in hope of it being overwritten)
    if (ls) {
      try {
        const result = JSON.parse(ls) as GithubRepo;
        this.repo = result;
        return result;
      } catch {
        /* empty */
      }
    }
    const response = await this.getUrl(
      `https://api.github.com/repos/${username}/${repo}`
    );

    // handle not found errors
    switch (response.status) {
      case 404:
        throw new Error(`Repository or User could not be found`);
      case 429:
      case 403: {
        const header = response.headers.get("x-ratelimit-reset");
        throw new Error(
          `Ip or token is rate limited, Reset on ${new Date(
            Number(header as string) * 1000
          ).toISOString()}`
        );
      }
      case 401:
        throw new Error(`Authentication Token is Expired or invalid`);
      default:
        if (!response.ok)
          throw new Error(`Unknown Api Error ${response.status}`);
    }
    const resultData = (await response.json()) as GithubRepo;

    // while resultData contains A Github repo data, it is better to store only the related parts
    const result: GithubRepo = {
      private: resultData.private,
      description: resultData.description,
      full_name: resultData.full_name,
    };

    this.repo = result;

    localStorage.setItem(
      `cache:repo:/${username}/${repo}/${branch}`,
      JSON.stringify(result)
    );
    return result;
  }
  /**
   * Resolve a regular github url to
   * branch, repo name etc
   * Resolve must be structured as follows
   *
   * /username/repositoryName/(tree | blob)/(branch)/[folder | file.js]
   */
  static parseResolveUrl(resolve: string): ResolvedRepoData | null {
    // trim https://github ...and trailing slashes (if any)
    const trimmedUrl = resolve
      .replace(/^https?:\/\/github\.com\//, "")
      .replace(/\/$/, "");
    const urlParts = trimmedUrl.split("/").filter((s) => s !== '');
    // under or = to 4 means it only upto (branch)
    // branch downloads already available using github
    if (urlParts.length <= 4) return null;
    const username = urlParts[0];
    const repo = urlParts[1];
    const type = urlParts[2];
    const branch = urlParts[3];
    const directory = urlParts.slice(4).join("/");
    const folder = urlParts[4]

    if (!username || !repo || !type || !branch || !directory) return null;

    return {
      username,
      repo,
      type,
      branch,
      directory,
      folder
    };
  }
}

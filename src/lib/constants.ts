export const links = {
  personalSite: "https://typical.gq",
  sourceRepo: "https://github.com/typicalninja/download-github-files",
  tutorialVid: "https://www.youtube.com/watch?v=9AUoDRbXml8",
  bugReport: "https://github.com/typicalninja/download-github-files/issues/new?title=[BUG]"
};

export enum AppStates {
  Idle = "IDLE",
  Starting = "STARTING",
  Downloading = "DOWNLOADING",
  Zipping = "ZIPPING",
  Finished = "FINISHED",
  //Resolving = "RESOLVING",
}

export interface File {
  /** Path of this file */
  path: string;
  /** Path without the requested folder path */
  relativePath: string;
  downloaded: boolean;
  /** Size in bytes */
  size: number;
  url: string;
}

export type ExtendedFileWithContent = File & { blob: Blob };

export interface GithubRepo {
  private?: boolean;
  full_name: string;
  description: string;
}

export interface GithubUser {
  login: string;
}

export interface ResolvedRepoData {
  username: string;
  repo: string;
  type: string;
  branch: string;
  directory: string;
  folder: string;
}


export interface DownloadableFile {
  filename: string;
  content: Blob | Uint8Array;
}


export interface RateLimitData {
  ratelimitlimit: 60
  ratelimitRemaining: 54
  ratelimitReset: 1689918160
  ratelimitUsed: 6
}
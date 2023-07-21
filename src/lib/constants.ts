export const links = {
  personalSite: "https://typical.gq",
  sourceRepo: "https://github.com/typicalninja493/download-github-files",
  analytics:
    "https://umami.typical.gq/share/PTgmfMcnZlnqokYT/Download%20Github%20files",
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
  dir: string;
  downloaded: boolean;
  failed: boolean;
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

export interface ResolvedGithubData {
  username: string;
  repo: string;
  type: string;
  dir: string;
  branch: string;
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
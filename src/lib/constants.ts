export const links = {
  personalSite: "https://typical.gq",
  sourceRepo: "https://github.com/typicalninja493/download-github-files",
  analytics: "https://umami.typical.gq/share/PTgmfMcnZlnqokYT/Download%20Github%20files"
};

export enum AppStates {
  Starting = "STARTING",
  Downloading = "DOWNLOADING",
  Finished = "FINISHED",
  Zipping = "ZIPPING",
  Resolving = "RESOLVING",
}

export interface File {
  dir: string;
  downloaded: boolean;
  failed: boolean;
}

export type ExtendedFileWithContent = File & { blob: Blob };

export interface GithubRepo {
  private?: boolean;
  full_name: string;
  description: string;
}

export interface ResolvedGithubData {
  username: string;
  repo: string;
  type: string;
  dir: string;
  branch: string;
}

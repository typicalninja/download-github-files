import { Flex, TextInput } from "@mantine/core";
import type { GithubRepo, ResolvedRepoData } from "../lib/constants";

// icons
import { AiOutlineCloudDownload, AiFillLock, AiFillFolderOpen } from "react-icons/ai";
import { GoRepo, GoGitBranch } from "react-icons/go";


import prettyBytes from 'pretty-bytes';


/**
 *  Used to show the information at the top of the page
 * @param resolvedData
 * @param githubData
 * @param fileLength
 * @returns
 */
export default function DownloaderInfoComponent({
  resolvedData,
  githubData,
  files
}: {resolvedData: ResolvedRepoData, githubData: GithubRepo, files: { count: number, size: number }}) {
  const { full_name, private: privateRepo } = githubData;
  const { branch, directory } = resolvedData;
  return (
    <Flex direction="column" gap="md">
      <span>
        <TextInput
          placeholder="Loading..."
          value={full_name}
          readOnly
          icon={privateRepo ? <AiFillLock /> : <GoRepo />}
        />
      </span>
      <span>
        <TextInput
          placeholder="Loading..."
          icon={<GoGitBranch />}
          value={branch || 'Invalid branch'}
          readOnly
        />
      </span>
      <span>
        <TextInput
          placeholder="Loading..."
          icon={<AiFillFolderOpen />}
          value={directory || 'Invalid Directory'}
          readOnly
        />
      </span>
      <span>
        <TextInput
          placeholder=""
          withAsterisk
          value={`Downloading ${files.count} File(s) of total size ${prettyBytes(files.size)}`}
          readOnly
          icon={<AiOutlineCloudDownload />}
        />
      </span>
    </Flex>
  );
}

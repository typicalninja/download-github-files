import { Flex, TextInput } from "@mantine/core";
import type { GithubRepo, ResolvedGithubData } from "../lib/constants";

// icons
import { AiOutlineCloudDownload, AiFillLock } from "react-icons/ai";
import { GoRepo, GoGitBranch } from "react-icons/go";
import { BiNote } from "react-icons/bi";

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
  fileLength
}: {resolvedData: ResolvedGithubData, githubData: GithubRepo, fileLength: number}) {
  const { full_name, description, private: privateRepo } = githubData;
  const { branch } = resolvedData;
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
          withAsterisk
          value={description || 'No Description'}
          readOnly
          icon={<BiNote />}
        />
      </span>
      <span>
        <TextInput
          placeholder=""
          withAsterisk
          value={`Downloading ${fileLength} File(s)`}
          readOnly
          icon={<AiOutlineCloudDownload />}
        />
      </span>
    </Flex>
  );
}

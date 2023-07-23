import { Flex, TextInput, LoadingOverlay, Box } from "@mantine/core";
import type { GithubRepo, ResolvedRepoData } from "../lib/constants";

// icons
import {
  AiOutlineCloudDownload,
  AiFillFolderOpen,
} from "react-icons/ai";
import { GoRepo, GoGitBranch, GoRepoLocked } from "react-icons/go";
import prettyBytes from "pretty-bytes";

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
  files,
  loading,
}: {
  resolvedData: ResolvedRepoData | null;
  githubData: GithubRepo | null;
  loading: boolean;
  files: { count: number; size: number };
}) {
  return (
    <Box pos="relative">
      <LoadingOverlay
        loaderProps={{ size: "lg", color: "blue", variant: "bars" }}
        visible={loading}
        overlayBlur={2}
      />
      <Flex direction="column" gap="xs">
        <TextInput
          placeholder="Loading..."
          value={githubData?.full_name || "Invalid Repo"}
          readOnly
          size="sm"
          icon={githubData?.private ? <GoRepoLocked /> : <GoRepo />}
        />
        <TextInput
          placeholder="Loading..."
          icon={<GoGitBranch />}
          value={resolvedData?.branch || "Invalid branch"}
          size="sm"
          readOnly
        />
        <TextInput
          placeholder="Loading..."
          icon={<AiFillFolderOpen />}
          value={resolvedData?.directory || "Invalid Directory"}
          size="sm"
          readOnly
        />
        <TextInput
          placeholder=""
          withAsterisk
          value={`Downloading ${
            files.count
          } File(s) of total size ${prettyBytes(files.size)}`}
          readOnly
          icon={<AiOutlineCloudDownload />}
          size="sm"
        />
      </Flex>
    </Box>
  );
}

import { Flex, TextInput, Button, Title, Divider, Text } from "@mantine/core";
import { BsCloudDownload } from "react-icons/bs";
import { AiFillFile } from "react-icons/ai";
import { links } from "../lib/constants";
import { useNavigate } from "react-router-dom";
import { useForm } from "@mantine/form";
import { useEffect } from "react";

export default function Index() {
  const navigate = useNavigate();
  const form = useForm({
    initialValues: {
      directoryLink: "",
    },
  });

  const onSubmit = (values: { directoryLink: string }) => {
    localStorage.setItem("savedDir", values.directoryLink);
    navigate(`/d?resolve=${values.directoryLink}`);
  };
  useEffect(() => {
    const savedDir = localStorage.getItem("savedDir");
    if (savedDir) form.setValues({ directoryLink: savedDir });
    // disable since, form changes when you type in the input, resulting in directoryLink Not changing
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Flex mih={200} gap="lg" justify="center" align="center" direction="column">
      <Title>Download Folders & Files from any* Github repository</Title>
      <Title order={5}>
        Effortlessly and swiftly download <Text span c="teal">individual</Text> directories or files from <Text span c="blue"inherit fw={500}> Github </Text> in a snap.
        Download the specific content you need without any hassle.
      </Title>
      <Divider />
      <form onSubmit={form.onSubmit(onSubmit)}>
        <TextInput
          placeholder="https://github.com/username/repo/file.png"
          label="Directory Link"
          size="md"
          withAsterisk
          required
          {...form.getInputProps("directoryLink")}
        />
        <Flex gap="md" mt={10}>
          <Button
            type="submit"
            leftIcon={<BsCloudDownload />}
            variant="light"
            color="violet"
            radius="xs"
            size="md"
          >
            Download directory
          </Button>
          <Button
            onClick={() => window.open(links.sourceRepo)}
            leftIcon={<AiFillFile />}
            variant="outline"
            color="teal"
            radius="xs"
            size="md"
          >
            Source code
          </Button>
        </Flex>
      </form>
      <Text fz="xs" c="red">* Does not support Private repositories</Text>
    </Flex>
  );
}

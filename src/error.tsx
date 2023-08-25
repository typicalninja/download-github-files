import { useRouteError, useNavigate } from "react-router-dom";
import { Code, Title, Text, Flex, Button, List } from "@mantine/core";
import { AiOutlineHome, AiFillBug } from 'react-icons/ai'
import { links } from "./lib/constants";

export default function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  console.error(`RouterError:`, error);

  return (
    <Flex mih={500} direction="column" justify="center" align="center" gap="md">
      <Title order={1} color="red.5">
        : ( Oops!
      </Title>
      <Text fw={700} fz="md">
        Sorry, an error occurred.
      </Text>
      <Code>
        <Text fs="italic" fw={500} fz="md">
          {(error as { statusText?: string }).statusText ||
            (error as Error).message}
        </Text>
      </Code>
      <Text c="orange.4">If you are trying to do any of the following,</Text>
      <List>
        <List.Item>Download the ENTIRE repository</List.Item>
        <List.Item>Download a single file (NOT a folder, folders with single files are supported)</List.Item>
      </List>
      <Text c="red.4">They are NOT supported by this tool, instead use the github native features to accomplish them</Text>
      {/** Go back button*/}
      <Flex gap="sm">
        <Button onClick={() => navigate("/")} leftIcon={<AiOutlineHome />} variant="light" color="cyan">
                Take me home...
        </Button>
         {/** Point to the github */}
        <Button onClick={() => window.open(links.bugReport)} leftIcon={<AiFillBug />} variant="outline" color="indigo">
            File a bug report
        </Button>
      </Flex>
    </Flex>
  );
}

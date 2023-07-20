import { useRouteError, useNavigate } from "react-router-dom";
import { Code, Title, Text, Flex, Button } from "@mantine/core";
import { AiOutlineHome, AiFillFile } from 'react-icons/ai'
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
        Sorry, an unexpected error occurred.
      </Text>
      <Code>
        <Text fs="italic" fw={500} fz="md">
          {(error as { statusText?: string }).statusText ||
            (error as Error).message}
        </Text>
      </Code>
      {/** Go back button*/}
      <Flex gap="sm">
        <Button onClick={() => navigate("/")} leftIcon={<AiOutlineHome />} variant="light" color="cyan">
                Take me home...
        </Button>
         {/** Point to the github */}
        <Button onClick={() => window.open(links.sourceRepo)} leftIcon={<AiFillFile />} variant="outline" color="indigo">
            Source code
        </Button>
      </Flex>
    </Flex>
  );
}

import {Footer, Text, Anchor, Flex, Divider} from '@mantine/core'
import { links } from '../lib/constants'

export default function FooterComponent() {
    return(
        <Footer height={40}>
            <Flex justify="center" gap="md">
            <Text align='center'>Made with ❤️ by <Anchor target="_blank" href={links.personalSite}>Typicalninja</Anchor></Text>
            <Divider  orientation="vertical"/>
            <Anchor href={links.sourceRepo}>Source code</Anchor>
            <Divider  orientation="vertical"/>
            <Anchor>Analytics</Anchor>
            </Flex>
        </Footer>
    )
}
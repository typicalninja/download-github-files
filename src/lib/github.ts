import { File, GithubRepo, GithubUser, ResolvedGithubData } from "./constants";
import { SettingsManager } from "./Settings";

export const fetchWithGithub = (url: string) => {
    const token = SettingsManager.getSetting('token');
    const tokenEnabled = SettingsManager.isSetting('tokenEnabled', [true])
    return fetch(url, token && tokenEnabled ? { headers: { Authorization: `Bearer ${token}`, }} : {})
}

export const fetchCurrentUser = async (): Promise<GithubUser> => {
    const request = await fetchWithGithub(' https://api.github.com/user')
    if(!request.ok) throw new Error(`Token is Invalid received code ${request.status}`)
    const json = await request.json() as GithubUser;
    return json;
}

/**
 * Parses github links
 * @example
 * /github/project/(tree | blob)/(branch)/[folder | file.js]
 */
export const parseGithubResolver = (resolver: string): ResolvedGithubData | null => {
    if(typeof resolver !== 'string') return null;
    // trim https://github ...and trailing slashes (if any)
    const trimmedUrl = resolver.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
    const parts = trimmedUrl.split('/');

    // must be at least 3 length (eg: /github/project/(tree | blob)/(branch)/[folder | file.js])
    if(parts.length <= 4) return null;

    const username = parts[0];
    const repo = parts[1];
    const type = parts[2];
    const branch = parts[3];
    // remaining is (branch/[folder | file.js])
    const dir = parts.slice(4).join('/');

    if(type !== 'tree' && type !== 'blob') return null

    return {
        username,
        repo,
        type,
        dir,
        branch
    }
}

/**
 * Fetch data on github repo
 * @param username 
 * @param repo 
 * @returns 
 */
export const fetchRepo = async (username: string, repo: string): Promise<GithubRepo> => {
    if(!username || !repo) throw new TypeError(`Username or repository missing`);
    const ls = localStorage.getItem(`repo:/${username}/${repo}`);
    if(ls) {
        console.log(`repo:/${username}/${repo} [Cache Found]`)
        try {
            return JSON.parse(ls) as GithubRepo
        } catch { /* empty */ }
    }

    const response = await fetchWithGithub(`https://api.github.com/repos/${username}/${repo}`);

    // handle not found errors
    switch(response.status) {
        case 404:
            throw new Error(`Repository or User could not be found`)
        case 429:
        case 403: {
            const header = response.headers.get('x-ratelimit-reset')
            throw new Error(`Ip or token is rate limited, Reset on ${new Date(Number(header as string) * 1000).toISOString()}`)
        }
        case 401:
            throw new Error(`Authentication Token is Expired or invalid`)
        default:
            if(!response.ok) throw new Error(`Unknown Api Error ${response.status}`)
    }

    const resultData = await response.json() as GithubRepo;

    // while resultData contains A Github repo data, it is better to store only the related parts
    const result: GithubRepo = {
        private: resultData.private,
        description: resultData.description,
        full_name: resultData.full_name
    }
    localStorage.setItem(`repo:/${username}/${repo}`, JSON.stringify(result));
    return result;
}

/** 
 *  uses "TreeApi" of github to get file
 * WARNING: Not reliable on large repositories
 * */
export const fetchDirectoryViaTrees = async ({ username, repo, branch, dir }: ResolvedGithubData) => {
    const files: File[] = []
    const response = await fetchWithGithub(`https://api.github.com/repos/${username}/${repo}/git/trees/${branch}?recursive=1`);
    if (!response.ok) {
        throw new Error(`Api Error ${response.statusText} for Directory Discovery`);
    }

    const json = await response.json() as {
        message?: string;
        tree: { path: string, type: string; url: string }[];
        truncated: boolean;
    };
    if(json.message) {
        throw new Error(`Api Returned error ${json.message}`);
    }

    for (const item of json.tree) {
		if (item.type === 'blob' && item.path.startsWith(dir)) {
			files.push({ dir: item.path, url: item.url, downloaded: false, failed: false });
		}
	}

    return {
        fileList: files,
        truncated: json.truncated
    };
}

/**
 * Fetch regular repos available from raw.githubusercontent.com
 * @param param0 
 * @param fileDir 
 * @returns 
 */
export const fetchFileContentAsPublic = async ({ branch, repo, username }: ResolvedGithubData, fileDir: string) => {
    const response = await fetch(`https://raw.githubusercontent.com/${username}/${repo}/${branch}/${fileDir}`);
    if (!response.ok) {
        throw new Error(`Api Error ${response.statusText} for ${fileDir}`);
    }

    return response.blob();
}

/**
 * Fetch repos that are private, must be requested via api instead of raw.githubusercontent.com
 * @param file 
 * @returns 
 */
export const fetchFileContentAsPrivate = async (file: File) => {
    const response = await fetchWithGithub(file.url);
    if (!response.ok) {
        throw new Error(`Api Error ${response.statusText} for ${file.dir} via private repos`);
    }
    const {content} = await response.json() as { content: string };
    const decoder = await fetch(`data:application/octet-stream;base64,${content}`);
    return decoder.blob();
}

export const fetchFileContent = async (repoData: GithubRepo, resolved: ResolvedGithubData, file: File) => {
  if(repoData.private) {
    return fetchFileContentAsPrivate(file)
  }
  else return fetchFileContentAsPublic(resolved, file.dir)
}

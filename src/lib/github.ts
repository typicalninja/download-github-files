import { File, GithubRepo, ResolvedGithubData } from "./constants";

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

    const response = await fetch(`https://api.github.com/repos/${username}/${repo}`);

    // handle not found errors
    switch(response.status) {
        case 404:
            throw new Error(`Repository or User could not be found`)
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
    const response = await fetch(`https://api.github.com/repos/${username}/${repo}/git/trees/${branch}?recursive=1`);
    if (!response.ok) {
        throw new Error(`Api Error ${response.statusText} for Directory Discovery`);
    }

    const json = await response.json() as {
        message?: string;
        tree: { path: string, type: string }[]
    };
    if(json.message) {
        throw new Error(`Api Returned error ${json.message}`);
    }

    console.log('json', json)
    for (const item of json.tree) {
		if (item.type === 'blob' && item.path.startsWith(dir)) {
       //     console.log(item.path)
			files.push({ dir: item.path, downloaded: false, failed: false });
		}
	}

    return files;
}

export const fetchFileContent = async (username: string, repo: string, branch: string, dir: string) => {
    const response = await fetch(`https://raw.githubusercontent.com/${username}/${repo}/${branch}/${dir}`);
    if (!response.ok) {
        throw new Error(`Api Error ${response.statusText} for ${dir}`);
    }

    return response.blob();
}
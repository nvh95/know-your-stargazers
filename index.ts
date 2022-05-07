import { Octokit } from '@octokit/core';
import { RequestError } from '@octokit/request-error';
import fs from 'fs';
import 'dotenv/config';
import path from 'path';
import chalk from 'chalk';

// TODO: Make an interactive app using inquirer and commander
// Check if TOKEN/ OWNER/ REPO is set, otherwise, prompt to ask
const TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;

function createDirIfNotExisted(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true,
    });
  }
}
const CACHE_FOLDER = path.join('.cache', `${OWNER}-${REPO}`);
// Each repo has its own cache folder
createDirIfNotExisted(CACHE_FOLDER);

const CURRENT_PAGE_CACHE = path.join(CACHE_FOLDER, 'currentPage');

const OUTPUT_BASE = `${OWNER}-${REPO}`;
createDirIfNotExisted(OUTPUT_BASE);
const OUTPUT_STARGAZERS = path.join(OUTPUT_BASE, 'output_stargazers.json');
const OUTPUT_DETAILED_USERS = path.join(
  OUTPUT_BASE,
  'output_detailed_users.json',
);
const OUTPUT_FOLLOWERS = path.join(OUTPUT_BASE, 'output_followers.json');

if (!OWNER || !REPO) {
  throw new Error(
    'Please provide the following environment variables, GITHUB_OWNER, GITHUB_REPO',
  );
}
const octokit = new Octokit({
  auth: TOKEN,
});

function addPersonToFile(persons: any) {
  // Check if file is existed
  // Query for additional information: number of followers
  // For each person, check if they existed in the list => overwrite for newer data
}

interface Stagazer {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
}

interface User {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  name: string;
  company: string;
  blog: string;
  location: string;
  email: string;
  hireable: boolean;
  bio: string;
  twitter_username: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

interface StarListResult {
  hasNextPage: boolean;
  stargazers: Stagazer[];
}

function appendStargazersToFile(stargazers: Stagazer[]) {
  let data = [] as Stagazer[];
  if (fs.existsSync(OUTPUT_STARGAZERS)) {
    try {
      data = JSON.parse(fs.readFileSync(OUTPUT_STARGAZERS, 'utf8'));
    } catch (error) {
      console.error(error);
    }
  }

  const newData = [...data, ...stargazers];
  fs.writeFileSync(OUTPUT_STARGAZERS, JSON.stringify(newData, null, 2));
}

function handleError(error: RequestError) {
  if (error.response.headers['x-ratelimit-remaining'] === '0') {
    console.error(
      chalk.red(
        `You reach the rate limit. Rate limit is reseted at ${new Date(
          Number(error.response.headers['x-ratelimit-reset']) * 1000,
        )}`,
      ),
    );
    if (!TOKEN) {
      console.log(
        chalk.green(
          `You can increase GitHub API rate limit to 5000 requests per hour by providing a personal access token via GITHUB_PERSONAL_ACCESS_TOKEN envionment variable.`,
          '\n',
          'Generate a personal access token at https://github.com/settings/tokens (No permission scopes needed).',
        ),
      );
    }
    throw new Error('Rate limit reached.');
  }
  // Just throw unexpeted error
  throw error;
}

async function fetchPage(page: number): Promise<StarListResult> {
  const lastPageCacheFile = path.join(CACHE_FOLDER, 'isLastPage');
  if (fs.existsSync(lastPageCacheFile)) {
    if (fs.readFileSync(lastPageCacheFile, 'utf-8') === 'true') {
      return {
        hasNextPage: false,
        stargazers: [],
      };
    }
  }
  console.log('Fetching page', page);
  // if hit rate limit => Print to console and exit
  try {
    const response = await octokit.request<Stagazer[]>({
      method: 'get',
      url: `/repos/${OWNER}/${REPO}/stargazers?page=${page}&per_page=100`,
    });
    console.log(
      chalk.gray(
        'Rate limit remaining',
        response.headers['x-ratelimit-remaining'],
      ),
    );
    if (response.status === 200) {
      appendStargazersToFile(response.data);
      // Cache current page
      fs.writeFileSync(CURRENT_PAGE_CACHE, page.toString());

      // Cache if it's a last page
      const isLastPage = response.data.length === 0;
      fs.writeFileSync(
        path.join(CACHE_FOLDER, 'isLastPage'),
        isLastPage.toString(),
      );
      return {
        hasNextPage: !isLastPage,
        stargazers: response.data,
      };
    } else {
      throw new Error('Status is not 200');
    }
  } catch (error) {
    handleError(error);
  }
}

function createFolderIfNotExisted(folder: string) {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, {
      recursive: true,
    });
  }
}

async function getUserInfo(username: string) {
  try {
    const response = await octokit.request<User>({
      method: 'get',
      url: `/users/${username}`,
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
}

async function fetchAllStargazers() {
  // Read current page since last time (start to crawl from currentPage-1)
  createFolderIfNotExisted(CACHE_FOLDER);

  let currentPage = 1;

  // No need to cache with ~1k repo. Optimize later
  if (fs.existsSync(CURRENT_PAGE_CACHE)) {
    currentPage = Number(fs.readFileSync(CURRENT_PAGE_CACHE, 'utf8'));
  }

  let haveNextPage = true;
  while (haveNextPage) {
    const result = await fetchPage(currentPage);
    console.log(`Retrieved ${result.stargazers.length} stargazers`);
    haveNextPage = result.hasNextPage;
    currentPage++;
  }

  // Clear currentPage.txt, isLastPage after fetching all pages
  // fs.unlinkSync(CURRENT_PAGE_CACHE);
  // fs.unlinkSync(path.join(CACHE_FOLDER, 'isLastPage'));
  // Count number of followers (Checksum)
  const stargazers = JSON.parse(
    fs.readFileSync(OUTPUT_STARGAZERS, 'utf8'),
  ) as Stagazer[];
  console.log('Total stargazers', stargazers.length);
}

async function fetchAllStargazersWithDetails() {
  if (!fs.existsSync(OUTPUT_STARGAZERS)) {
    throw new Error('Stagazers file does not exist. Fetch stagazers first.');
  }

  const stargazers = JSON.parse(
    fs.readFileSync(OUTPUT_STARGAZERS, 'utf8'),
  ) as Stagazer[];

  const BATCH_SIZE = 2;
  const NUM_OF_BATCHS = Math.ceil(stargazers.length / BATCH_SIZE);

  let BATCH_INDEX_CACHE = 0;

  if (fs.existsSync(path.join(CACHE_FOLDER, 'batchIndex'))) {
    BATCH_INDEX_CACHE =
      Number(fs.readFileSync(path.join(CACHE_FOLDER, 'batchIndex'), 'utf8')) +
      1;
  }

  for (
    let batchIndex = BATCH_INDEX_CACHE;
    batchIndex < NUM_OF_BATCHS;
    batchIndex++
  ) {
    // Fetch all user info and save to disk
    const detailedStargazers = await Promise.all(
      stargazers
        .slice(BATCH_SIZE * batchIndex, BATCH_SIZE * (batchIndex + 1))
        .map(async (stargazer) => {
          console.log(`Fetching user info for ${stargazer.login}`);
          const userInfo = await getUserInfo(stargazer.login);
          return userInfo;
        }),
    );
    console.log('\n');

    let data = [] as User[];
    if (fs.existsSync(OUTPUT_DETAILED_USERS)) {
      try {
        data = JSON.parse(fs.readFileSync(OUTPUT_DETAILED_USERS, 'utf8'));
      } catch (error) {
        console.error(error);
      }
    }

    const newData = [...data, ...detailedStargazers];
    fs.writeFileSync(OUTPUT_DETAILED_USERS, JSON.stringify(newData, null, 2));
    fs.writeFileSync(
      path.join(CACHE_FOLDER, 'batchIndex'),
      batchIndex.toString(),
    );
  }
}

function reportFollowerInfo() {
  const users = JSON.parse(
    fs.readFileSync(OUTPUT_DETAILED_USERS, 'utf8'),
  ) as User[];

  let userWithFollowers = users.map((user) => ({
    login: user.login,
    followers: user.followers,
    company: user.company,
    location: user.location,
  }));

  userWithFollowers.sort((a, b) => b.followers - a.followers);
  userWithFollowers = userWithFollowers.map((user, index) => ({
    rank: index + 1,
    ...user,
  }));
  fs.writeFileSync(
    OUTPUT_FOLLOWERS,
    JSON.stringify(userWithFollowers, null, 2),
  );
}

fetchAllStargazers().then(async () => {
  await fetchAllStargazersWithDetails();
  reportFollowerInfo();
});

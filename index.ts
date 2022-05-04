import { Octokit } from '@octokit/core';
import fs from 'fs';
import 'dotenv/config';
import path from 'path';

const TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;

const CACHE_FOLDER = '.cache';
const CURRENT_PAGE_CACHE = path.join(CACHE_FOLDER, 'currentPage.txt');

const OUTPUT_STARGAZERS = 'output_stagazers.json';
const OUTPUT_DETAILED_USERS = 'output_detailed_users.json';
const OUTPUT_FOLLOWERS = 'output_followers.json';

if (!TOKEN || !OWNER || !REPO) {
  throw new Error(
    'Please provide the following environment variables: GITHUB_PERSONAL_ACCESS_TOKEN, GITHUB_OWNER, GITHUB_REPO',
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
  site_admin: false;
  name: string;
  company: string;
  blog: string;
  location: null;
  email: null;
  hireable: true;
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
  stargazers: any[];
}

function appendDataToFile(stargazers: Stagazer[]) {
  let data = [] as Stagazer[];
  if (fs.existsSync(OUTPUT_STARGAZERS)) {
    try {
      data = JSON.parse(fs.readFileSync(OUTPUT_STARGAZERS, 'utf8'));
    } catch (error) {
      console.error(error);
    }
  }

  const newData = [...data, ...stargazers];
  fs.writeFileSync(OUTPUT_STARGAZERS, JSON.stringify(newData));
}

async function fetchPage(page: number): Promise<StarListResult> {
  console.log('Fetching page', page);
  fs.writeFileSync(CURRENT_PAGE_CACHE, page.toString());
  // if hit rate limit => Print to console and exit
  const response = await octokit.request<Stagazer[]>({
    method: 'get',
    url: `/repos/${OWNER}/${REPO}/stargazers?page=${page}&per_page=100`,
  });
  // TODO: Handle failed (e.g: rate limit)
  appendDataToFile(response.data);
  return {
    hasNextPage: response.data.length > 0,
    stargazers: response.data,
  };
  // Log to file
}

function createFolderIfNotExisted(folder: string) {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, {
      recursive: true,
    });
  }
}

async function getUserInfo(username: string) {
  const response = await octokit.request<User>({
    method: 'get',
    url: `/users/${username}`,
  });
  return response.data;
}

async function main() {
  // Read current page since last time (start to crawl from currentPage-1)
  createFolderIfNotExisted(CACHE_FOLDER);

  let currentPage = 1;

  // No need to cache with ~1k repo. Optimize later
  // if (fs.existsSync(CURRENT_PAGE_CACHE)) {
  //   currentPage = Number(fs.readFileSync(CURRENT_PAGE_CACHE, 'utf8'));
  // }
  // Just remove the output file if existed first
  if (fs.existsSync(OUTPUT_STARGAZERS)) {
    fs.unlinkSync(OUTPUT_STARGAZERS);
  }

  let haveNextPage = true;
  while (haveNextPage) {
    const result = await fetchPage(currentPage);
    console.log(`Retrieved ${result.stargazers.length} stargazers`);
    haveNextPage = result.hasNextPage;
    currentPage++;
  }

  // Count number of followers (Checksum)
  const stargazers = JSON.parse(
    fs.readFileSync(OUTPUT_STARGAZERS, 'utf8'),
  ) as Stagazer[];
  console.log('Total stargazers', stargazers.length);
}

async function fetchAllUsers() {
  if (!fs.existsSync(OUTPUT_STARGAZERS)) {
    throw new Error('Stagazers file does not exist. Fetch stagazers first.');
  }

  const stargazers = JSON.parse(
    fs.readFileSync(OUTPUT_STARGAZERS, 'utf8'),
  ) as Stagazer[];

  // Fetch all user info and save to disk
  const detailedStargazers = await Promise.all(
    stargazers.map(async (stargazer) => {
      console.log(`Fetching user info for ${stargazer.login}`);
      const userInfo = await getUserInfo(stargazer.login);
      return userInfo;
    }),
  );
  console.log('detailedStargazers', detailedStargazers);
  fs.writeFileSync(OUTPUT_DETAILED_USERS, JSON.stringify(detailedStargazers));
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

function main2() {
  reportFollowerInfo();
}

main2();
// main();

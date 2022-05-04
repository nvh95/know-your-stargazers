import { Octokit } from '@octokit/core';
import fs from 'fs';
import 'dotenv/config';
import path from 'path';

const TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;

const CACHE_FOLDER = '.cache';
const CURRENT_PAGE_CACHE = path.join(CACHE_FOLDER, 'currentPage.txt');

const OUTPUT = 'output.json';

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

interface StarListResult {
  hasNextPage: boolean;
  stargazers: any[];
}

function appendDataToFile(stargazers: Stagazer[]) {
  let data = [] as Stagazer[];
  if (fs.existsSync(OUTPUT)) {
    try {
      data = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));
    } catch (error) {
      console.error(error);
    }
  }

  const newData = [...data, ...stargazers];
  fs.writeFileSync(OUTPUT, JSON.stringify(newData));
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

async function main() {
  // Read current page since last time (start to crawl from currentPage-1)
  createFolderIfNotExisted(CACHE_FOLDER);

  let currentPage = 1;

  // No need to cache with ~1k repo. Optimize later
  // if (fs.existsSync(CURRENT_PAGE_CACHE)) {
  //   currentPage = Number(fs.readFileSync(CURRENT_PAGE_CACHE, 'utf8'));
  // }
  // Just remove the output file if existed first
  if (fs.existsSync(OUTPUT)) {
    fs.unlinkSync(OUTPUT);
  }

  let haveNextPage = true;
  while (haveNextPage) {
    const result = await fetchPage(currentPage);
    console.log(`Retrieved ${result.stargazers.length} stargazers`);
    haveNextPage = result.hasNextPage;
    currentPage++;
  }

  // Count number of followers (Checksum)
  const stargazers = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));
  console.log('Total stargazers', stargazers.length);
}

main();

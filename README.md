<h1 align="center">
<a href="npmjs.com/package/know-your-stargazers">⭐️ Know Your Stargazers ⭐️</a>
</h1>

<p align="center">
Know more about who starred your repository 🕵️
</p>

<p align="center">
  <img align="center" src="https://user-images.githubusercontent.com/8603085/167408030-7c0957dd-4434-403b-abf4-c002db260dc4.png" alt="Top ten stargazers with most followers for jest-preview" />
</p>

[![npm](https://img.shields.io/npm/v/know-your-stargazers)](https://www.npmjs.com/package/know-your-stargazers)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-green.svg)

## Why **know-your-stargazers**

When developing an open source project, sometimes you are curious to know who starred your project. `know-your-stargazers` is a simple CLI program that will help you to know who are interested to your project.

## How to use

Just simply run:

```bash
npx know-your-stargazers
```

## GitHub Personal Access Token

`know-your-stargazers` uses [GitHub API](https://docs.github.com/en/rest) to crawl your stargazers (i.e: who starred your project). The default GitHub API rate limit is 60 requests per hour. By providing a personal access token, you can [increase the rate limit to 5000 requests per hour](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#requests-from-personal-accounts).

## Environment Variables

`know-your-stargazers` prefills the default values of `owner`, `repo` and `token` by looking for the following environment variables: `GITHUB_PERSONAL_ACCESS_TOKEN`, `GITHUB_OWNER` and `GITHUB_REPO`. You can set these environment variables in your `.env` file as well.

```bash
// .env
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_something
GITHUB_OWNER=username-or-organization
GITHUB_REPO=repo-name

```

## Future fearures

- 🚧 Get arguments from command line
- 🚧 Run `know-your-stargazers` on a browser

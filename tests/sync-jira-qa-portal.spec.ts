import { test, expect } from '@playwright/test';
import { JiraClient } from '../helpers/jiraClient';
import { jiraData } from '../data/jiraData';
import { QAPortalQualityTracker } from '../page_objects/QAPortalQualityTracker';

let statsByPlatform: Record<string, Record<string, number>> = {};

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let jiraUser: any;
let filterJQL: string;
let allIssues: any [] = [];




test.describe.configure({ mode: 'serial' });


test('authorizes in Jira', async () => {
    
    console.log(GREEN + "Step 1: authorizes in Jira");

    const jira = new JiraClient();
    const resp = await jira.getMyself();
    expect(resp.status).toBe(200);
    jiraUser = resp.data;
    console.log('✅ Jira user:', jiraUser.emailAddress || jiraUser.accountId);
    expect(jiraUser.emailAddress).toBe(process.env.JIRA_EMAIL);
  
});

test('retrieves JQL from Jira filter', async () => {
  console.log(CYAN + 'Step 2: retrieves JQL from Jira filter');
  const jira = new JiraClient();
  const filterId = jiraData.allBugsFilter;
  const resp = await jira.getFilter(filterId);
  expect(resp.status).toBe(200);
  const filter = resp.data;
  filterJQL = filter.jql;
  console.log('✅ JQL retrieved:', filterJQL);
  expect(typeof filterJQL).toBe('string');
});

test('fetches all issues from Jira', async () => {
  console.log(RED + 'Step 3: fetches all issues from Jira');
  const jira = new JiraClient();
  const jql = filterJQL;
  const fields = [jiraData.customFields.platform, jiraData.customFields.priority];
  allIssues = await jira.getAllIssues(jql, fields);
  console.log(`✅ Retrieved ${allIssues.length} issues`);
  expect(allIssues.length).toBeGreaterThan(0);
  for (const issue of allIssues) {
    expect(issue.fields).toBeTruthy();
  }
});

test('counts bugs grouped by platform', async () => {
  // define known platforms/priorities (optional; code works with dynamic values too)
  const knownPlatforms = ['Tizen','WebOS','AndroidTV','Android','iOS','tvOS','Chromecast'];
  const knownPriorities = ['Highest','High','Medium','Low','Lowest'];

  console.log(GREEN + 'Step 4: counts by platform');

  // initialize stats object (ensure keys exist if you prefer zeros for all combinations)
  statsByPlatform = {};

  // iterate issues and accumulate counts
  for (const issue of allIssues) {
    const priName: string = issue?.fields?.priority?.name ?? 'Unknown';
    let platformsField: any = issue?.fields?.customfield_10622;

    if (!platformsField) {
      // if platform not present, count under "Unknown"
      platformsField = ['Unknown'];
    } else if (!Array.isArray(platformsField)) {
      platformsField = [platformsField];
    }

    for (const platform of platformsField) {
      const plat = String(platform);
      if (!statsByPlatform[plat]) statsByPlatform[plat] = {};
      if (!statsByPlatform[plat][priName]) statsByPlatform[plat][priName] = 0;
      statsByPlatform[plat][priName] += 1;
    }
  }

  console.log('Grouped stats by platform and priority:\n', statsByPlatform);

  // basic assertions: at least one platform counted
  expect(Object.keys(statsByPlatform).length).toBeGreaterThan(0);
});

test('authorizes in QA-Portal', async ({ page }) => {

  console.log(CYAN + 'Step 5: QA portal authorization');
  const qaPortalQualityTracker = new QAPortalQualityTracker(page);
  
  const login = process.env.QATRACKER_LOGIN;
  const password = process.env.QATRACKER_PASSWORD;

  await qaPortalQualityTracker.visit();
  await qaPortalQualityTracker.login(login, password);
  
  await expect(qaPortalQualityTracker.logOutButton).toBeVisible();
  console.log(CYAN + 'login successfull')

  //await page.pause();


});

test.skip('retrieves available projects from QA-Portal', async ({ request }) => {
    await request.goto('/');
    await expect(request).toHaveURL('https://playwright.dev/docs/intro');
});

test.skip('syncs grouped bug data to QA-Portal', async ({ request }) => {
    await request.goto('/');
    await expect(request).toHaveURL('https://playwright.dev/docs/intro');
});
import { test, expect } from '@playwright/test';
import { JiraClient } from '../helpers/jiraClient';
import { jiraData } from '../data/jiraData';
import { QAPortalQualityTracker } from '../page_objects/QAPortalQualityTracker';
import { platformMapping } from '../data/platformMapping'; // add at file top with other imports

import * as fs from 'fs';

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

      // Проверка статуса ответа
  if (!resp.status || resp.status < 200 || resp.status >= 300) {
    console.error(RED + `❌ Jira API Error: HTTP ${resp.status} ${resp.statusText}` + RESET);
    console.error(RED + `Response data:`, resp.data + RESET);
    throw new Error(
      `Jira authorization failed with status ${resp.status}. ` +
      `Check JIRA_API_TOKEN, JIRA_EMAIL, and JIRA_BASE_URL in .env file. ` +
      `Response: ${JSON.stringify(resp.data)}`
    );
  }

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

test('authorizes in QA-Portal', async ({ page, context }) => {
  

  console.log(CYAN + 'Step 5: QA portal authorization');
  const qaPortalQualityTracker = new QAPortalQualityTracker(page);
  
  const login = process.env.QATRACKER_LOGIN!;
  const password = process.env.QATRACKER_PASSWORD!;

  await qaPortalQualityTracker.visit();
  await qaPortalQualityTracker.login(login, password);
  
  await expect(qaPortalQualityTracker.logOutButton).toBeVisible();
  console.log(GREEN + '✅ QA Portal login successful' + RESET);

    // сохранить storageState (cookies + localStorage)
  const storageState = await context.storageState();
  fs.writeFileSync('auth.json', JSON.stringify(storageState, null, 2));
  console.log('✅ Session saved to auth.json');

  //await page.pause();


});

test('syncs grouped bug data to QA-Portal', async ({ browser }) => {
    
  console.log(GREEN + 'Step 6: Syncs bug data to QA-Portal' + RESET);

  // создать новый контекст с сохранённым состоянием из auth.json
  const context = await browser.newContext({
    storageState: 'auth.json',
  });
  const page = await context.newPage();

  const qaPortalQualityTracker = new QAPortalQualityTracker(page);
  
  await qaPortalQualityTracker.visit();
  await expect(qaPortalQualityTracker.logOutButton).toBeVisible();
  console.log('✅ Session restored, user is logged in');

  let synced = 0;

  // Iterate platformMapping in a stable order
  for (const [platformKey, projectName] of Object.entries(platformMapping)) {
    console.log(`\n📊 Processing platform mapping: ${platformKey} -> ${projectName}`);

    // 1) initial inputs should be disabled
    await expect(qaPortalQualityTracker.disabledInput).toBeEnabled();

    // 2) click to enable inputs
    await qaPortalQualityTracker.projectSizeMedium.click();
    // 3) now inputs should be enabled
    await expect(qaPortalQualityTracker.enabledInput).toBeVisible();

      // 4) open Save modal so we can try selecting project
    await qaPortalQualityTracker.saveResultLink.click();
    await qaPortalQualityTracker.projectsDropdown.waitFor({ state: 'visible', timeout: 3000 });

    // Try to select project BEFORE filling values.
    // If selection fails (option not found or disabled), skip filling and continue to next platform.
    const projectSelected = await qaPortalQualityTracker.selectProjectByPlatform(platformKey);
    if (!projectSelected) {
      console.log(`⏭️  Skipping ${platformKey} — project not available or disabled`);
      // set all fields to 0 before moving on (as requested)
      if (typeof qaPortalQualityTracker.clearAllFields === 'function') {
        await qaPortalQualityTracker.clearAllFields();
      }
      // close modal if needed (attempt press Esc or click outside). Adjust if your UI differs.
      await qaPortalQualityTracker.page.keyboard.press('Escape').catch(() => {});
      continue;
    };

    // 5) prepare stats for this platform — fill values only when project is selectable
    const stats = (statsByPlatform as Record<string, Record<string, number>>)[platformKey];
    if (stats && Object.keys(stats).length > 0) {
      await qaPortalQualityTracker.fillBugsByPriority(stats);
      console.log(`Filled values for ${platformKey}:`, stats);
    } else {
      console.log(`No data for ${platformKey}; leaving default values`);
  }

    // 6) click Save
    await qaPortalQualityTracker.saveResultButton.click();

    // 7) wait for UI to return to disabled state before next platform
    // Wait that field becomes disabled again (save action should disable inputs)
    await expect(qaPortalQualityTracker.disabledInput).toBeEnabled({ timeout: 8000 });

    synced++;
    console.log(`✅ Synced ${platformKey}`);
  }

  console.log(GREEN + `\n✅ All ${synced} platforms synced to QA Portal` + RESET);
  expect(synced).toBeGreaterThan(0);

  await context.close();

    
});
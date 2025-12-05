import { expect, Page, Locator } from "@playwright/test";
import { platformMapping } from "../data/platformMapping";
import { priorityMapping } from '../data/priorityMapping';

export class QAPortalQualityTracker {

    page: Page;
    loginField: Locator;
    passwordField: Locator;
    logInButton: Locator;
    projectSizeMedium: Locator;
    fieldBlocker: Locator;
    fieldCritical: Locator;
    fieldMajor: Locator;
    fieldMinor: Locator;
    fieldTrivial: Locator;
    saveResultLink: Locator;
    projectsDropdown: Locator;
    logOutButton: Locator;
    saveResultButton: Locator;
    disabledInput: Locator;
    enabledInput: Locator;

    constructor(page: Page) {
        this.page = page;
        this.loginField = page.getByRole('textbox', { name: 'Login' });
        this.passwordField = page.getByRole('textbox', { name: 'Password' });
        this.logInButton = page.getByRole('button', { name: 'Log in' })
        this.projectSizeMedium = page.locator('#project-size-medium');
        this.fieldBlocker = page.getByRole('spinbutton', { name: 'Blocker Critical Major Minor' });
        this.fieldCritical = page.locator('#critical');
        this.fieldMajor = page.locator('#major');
        this.fieldMinor = page.locator('#minor');
        this.fieldTrivial = page.locator('#trivial');
        this.saveResultLink = page.getByRole('link', { name: 'Save the result to \'Quality' });
        this.projectsDropdown = page.getByRole('combobox');
        this.logOutButton = page.getByRole('button', { name: 'Log out' });
        this.saveResultButton = page.getByRole('button', { name: 'Save' });
        this.disabledInput = page.locator('.overlay').first();
        this.enabledInput = page.getByText('Blocker+−0 % of all bugs0 % of quality decreaseCritical+−0 % of all bugs0 % of');
    };

    visit = async (): Promise<void> => {
        await this.page.goto("/qa-tracker/calculator");
    };

    login = async (loginName: string, password: string): Promise<void> => {
        await this.loginField.waitFor();
        await this.loginField.fill(loginName);
        await this.passwordField.waitFor();
        await this.passwordField.fill(password);
        await this.logInButton.click();
        await this.page.waitForLoadState('networkidle');
    };

    selectProjectByPlatform = async (platform: string): Promise<boolean> => {
        const projectName = platformMapping[platform];
        if (!projectName) {
            console.log(`⚠️ Skipping unmapped platform: ${platform}`);
            return false;
        }

         // проверить, есть ли опция в dropdown'е и включена ли она
    const option = this.page.getByRole('option', { name: projectName });
    try {
        await option.waitFor({ state: 'visible', timeout: 2000 });
        
        // проверить, disabled ли опция
        const isDisabled = await option.evaluate((el: HTMLOptionElement) => el.disabled);
        if (isDisabled) {
            console.log(`⚠️ Project option "${projectName}" is DISABLED. Skipping...`);
            return false;
        }

        // если включена — выбираем
        await this.projectsDropdown.selectOption(projectName);
        await this.page.waitForTimeout(500);
        console.log(`✅ Selected project: ${projectName}`);
        return true;
    } catch (err) {
        console.log(`⚠️ Project option "${projectName}" not found or not available. Skipping...`);
        return false;
    }
    };
    

    fillBugsByPriority = async (stats: Record<string, number>): Promise<void> => {
        const qaFieldMap: Record<string, Locator> = {
            blocker: this.fieldBlocker,
            critical: this.fieldCritical,
            major: this.fieldMajor,
            minor: this.fieldMinor,
            trivial: this.fieldTrivial,
        };

        for (const [jiraPriRaw, count] of Object.entries(stats)) {
            const jiraPri = String(jiraPriRaw ?? '').trim();
            
            let mapped = priorityMapping[jiraPri];
            if (!mapped) {
                const key = Object.keys(priorityMapping).find(
                    k => k.toLowerCase() === jiraPri.toLowerCase()
                );
                mapped = key ? priorityMapping[key] : undefined;
            }

            if (!mapped) {
                console.log(`⚠️ Skipping unmapped priority: "${jiraPri}"`);
                continue;
            }

            const field = qaFieldMap[mapped];
            if (!field) {
                console.log(`⚠️ No QA field for mapped key: ${mapped}`);
                continue;
            }

            await field.fill(String(count));
            console.log(`✅ Filled ${mapped}: ${count}`);
        }
    };
    

    saveResults = async (): Promise<void> => {
        await this.saveResultLink.click();
        await this.page.waitForTimeout(1000);
    }; 
    
    clearAllFields = async (): Promise<void> => {
        await this.fieldBlocker.fill('0');
        await this.fieldCritical.fill('0');
        await this.fieldMajor.fill('0');
        await this.fieldMinor.fill('0');
        await this.fieldTrivial.fill('0');
        console.log('✅ Cleared all fields (set to 0)');
};

}
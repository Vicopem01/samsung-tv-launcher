import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

let runtimeErrors: string[]
let failedLocalResponses: string[]

test.use({ viewport: { width: 1920, height: 1080 } })

test.beforeEach(async ({ page }) => {
  runtimeErrors = []
  failedLocalResponses = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })
  page.on('response', (response) => {
    if (response.url().startsWith('http://127.0.0.1:7101') && response.status() >= 400) {
      failedLocalResponses.push(`${response.status()} ${response.url()}`)
    }
  })
})

test.afterEach(() => {
  expect(runtimeErrors, 'browser console and runtime errors').toEqual([])
  expect(failedLocalResponses, 'failed local asset requests').toEqual([])
})

async function mockWeather(page: Page) {
  await page.route('https://geocoding-api.open-meteo.com/**', (route) => route.fulfill({
    json: { results: [{ name: 'Testville', latitude: 43.65, longitude: -79.38 }] },
  }))
  await page.route('https://api.open-meteo.com/**', (route) => route.fulfill({
    json: {
      current: { temperature_2m: -3.4, weather_code: 71, is_day: 0 },
      daily: { temperature_2m_max: [1.2], temperature_2m_min: [-7.6] },
    },
  }))
}

const appNames = async (page: Page) => page.locator('.shelf-row .app-tile .tile-name').allTextContents()

test('Home shows one recent app, an apps row ending in All apps, and consoles', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)

  await expect(page.locator('.brand p')).toHaveText(/Good (morning|afternoon|evening)/)
  await expect(page.locator('.hero-card')).toBeFocused()
  await expect(page.locator('.hero-name')).toHaveText('Netflix')
  await expect(page.locator('.hero-eyebrow')).toHaveText('Ready when you are')

  expect(await appNames(page)).toEqual([
    'Netflix', 'YouTube', 'Prime Video', 'Disney+', 'Crave', 'Apple TV', 'TSN', 'DAZN', 'All apps',
  ])
  // A normal browser can't detect HDMI, so every listed console shows.
  await expect(page.locator('.console-tile')).toHaveCount(3)
  await expect(page.locator('.tile-number')).toHaveCount(0)

  // Lights, night mode, and the old header buttons are gone.
  await expect(page.getByRole('button', { name: /lights/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /(day|night) mode/i })).toHaveCount(0)
  // Static Christmas scene with a light snow layer, and no lights.
  await expect(page.locator('.christmas-scene')).toBeVisible()
  await expect(page.locator('.snowfall .snowflake')).toHaveCount(20)
  await expect(page.locator('.bulb')).toHaveCount(0)

  const dimensions = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width)
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.height)

  // Every visible section fits on the 1080p screen.
  const lastConsole = await page.locator('.console-tile').last().boundingBox()
  expect(lastConsole!.y + lastConsole!.height).toBeLessThanOrEqual(1080)

  await page.screenshot({ path: 'test-results/home-tv.png', animations: 'disabled' })
})

test('weather appears top right when a city is set', async ({ page }) => {
  await mockWeather(page)
  await page.addInitScript(() => window.localStorage.setItem('ourhome-weather-city', 'Testville'))
  await page.goto('/')
  const weather = page.locator('.weather')
  await expect(weather).toContainText('-3°')
  await expect(weather).toContainText('Snow')
  await expect(weather).toContainText('H 1°')
  await expect(weather).toContainText('L -8°')

  const weatherBox = await weather.boundingBox()
  expect(weatherBox!.x).toBeGreaterThan(1920 / 2)
  expect(weatherBox!.y).toBeLessThan(200)
  await page.screenshot({ path: 'test-results/home-tv-weather.png', animations: 'disabled' })
})

test('remote arrows move between the recent app, apps, and consoles', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.hero-card')).toBeFocused()

  // Down from the big card always starts at the first app.
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('button', { name: 'Open Netflix' }).last()).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('button', { name: 'Open Netflix' }).last()).toBeFocused()

  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('button', { name: 'Open YouTube' })).toBeFocused()

  // Down lands on the console most directly below (Xbox, under the wider YouTube tile).
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('button', { name: 'Switch to Xbox' })).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('.console-tile').first()).toBeFocused()

  await page.keyboard.press('ArrowUp')
  await expect(page.locator('.shelf-row .app-tile:focus')).toHaveCount(1)
  await page.keyboard.press('ArrowUp')
  await expect(page.locator('.hero-card')).toBeFocused()

  // Walking right through the row scrolls to the All apps tile at the end.
  await page.keyboard.press('ArrowDown')
  for (let index = 0; index < 10; index += 1) await page.keyboard.press('ArrowRight')
  const allApps = page.getByRole('button', { name: 'All apps' })
  await expect(allApps).toBeFocused()
  const allAppsBox = await allApps.boundingBox()
  expect(allAppsBox!.x + allAppsBox!.width).toBeLessThanOrEqual(1920)

  await page.keyboard.press('Escape')
  await expect(page.locator('.hero-card')).toBeFocused()
})

test('opening an app makes it the big recent app, and it survives a reload', async ({ page, context }) => {
  await context.route('https://www.youtube.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<title>YouTube test</title>' }))
  await page.goto('/')

  const popupPromise = page.waitForEvent('popup')
  await page.keyboard.press('2')
  const popup = await popupPromise
  await expect(popup).toHaveURL('https://www.youtube.com/')
  await popup.close()

  await expect(page.getByRole('status')).toContainText('Opening YouTube')
  await expect(page.locator('.hero-name')).toHaveText('YouTube')
  await expect(page.locator('.hero-eyebrow')).toHaveText('Jump back in')

  await page.reload()
  await expect(page.locator('.hero-name')).toHaveText('YouTube')
  await expect(page.getByRole('button', { name: 'Open YouTube' }).first()).toBeFocused()
})

test('All apps adds apps to Home, and Arrange reorders, removes, and resets', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'All apps' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('.collection-item')).toHaveCount(10)
  await page.screenshot({ path: 'test-results/all-apps.png', animations: 'disabled' })

  await page.getByRole('button', { name: 'Add Spotify to Home' }).click()
  await page.getByRole('button', { name: 'Arrange Home' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(page.locator('.arrange-row')).toHaveCount(10)
  await page.screenshot({ path: 'test-results/arrange.png', animations: 'disabled' })

  await page.getByRole('button', { name: 'Remove Netflix from Home' }).click()
  await page.getByRole('button', { name: 'Move Prime Video earlier' }).click()
  await page.getByRole('button', { name: 'Done' }).click()

  const expected = ['Prime Video', 'YouTube', 'Disney+', 'Crave', 'Apple TV', 'TSN', 'DAZN', 'Spotify', 'All apps']
  expect(await appNames(page)).toEqual(expected)

  await page.reload()
  expect(await appNames(page)).toEqual(expected)

  await page.getByRole('button', { name: 'All apps' }).click()
  await page.getByRole('button', { name: 'Arrange Home' }).click()
  await page.getByRole('button', { name: 'Reset' }).click()
  await page.getByRole('button', { name: 'Done' }).click()
  expect((await appNames(page))[0]).toBe('Netflix')
})

test('remote arrows and the TV Back key work inside dialogs', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'All apps' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()

  await page.keyboard.press('ArrowDown')
  await expect(page.locator('.dialog-content button:focus')).toHaveCount(1)
  await page.keyboard.press('ArrowDown')
  const focusedInDialog = await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))
  expect(focusedInDialog).toBe(true)

  await page.evaluate(() => {
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'XF86Back', bubbles: true }))
  })
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('console tiles explain input switching in the preview', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Switch to PlayStation 5' }).click()
  await expect(page.getByRole('status')).toContainText('PlayStation 5 is on HDMI 1')
})

const consoleNames = (page: Page) => page.locator('.console-tile strong').allTextContents()
const setMockHdmi = (page: Page, status: Record<number, boolean>) =>
  page.evaluate((value) => localStorage.setItem('ourhome-mock-hdmi', JSON.stringify(value)), status)

test('only consoles on connected HDMI ports are shown', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('ourhome-mock-hdmi')) {
      localStorage.setItem('ourhome-mock-hdmi', JSON.stringify({ 1: true, 2: true, 3: false, 4: false }))
    }
  })
  await page.goto('/')
  await expect.poll(() => consoleNames(page)).toEqual(['PlayStation 5', 'Xbox'])

  // Plugging in the Switch makes it appear when Home becomes visible again, without a reload.
  await setMockHdmi(page, { 1: true, 2: true, 3: true, 4: false })
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect.poll(() => consoleNames(page)).toEqual(['PlayStation 5', 'Xbox', 'Nintendo Switch'])

  // Unplugging everything hides the Consoles section entirely.
  await setMockHdmi(page, { 1: false, 2: false, 3: false, 4: false })
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(page.locator('#consoles-title')).toHaveCount(0)
})

test('a connected port that is not listed shows as a new device', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ourhome-mock-hdmi', JSON.stringify({ 1: true, 4: true })))
  await page.goto('/')
  await expect.poll(() => consoleNames(page)).toEqual(['PlayStation 5', 'HDMI 4'])
  await expect(page.getByRole('button', { name: 'Switch to HDMI 4' })).toContainText('New device')
})

const mockInstalledApps = [
  { id: 'org.tizen.netflix-app', name: 'Netflix', show: true },
  { id: 'Abc1234567.youtube', name: 'YouTube', show: true },
  { id: 'Abc1234567.crave', name: 'Crave', show: true },
  { id: 'Abc1234567.cbcgem', name: 'CBC Gem', show: true },
  { id: 'Abc1234567.dataservice', name: 'EP data service', show: true },
  { id: 'Abc1234567.hiddenthing', name: 'Hidden Thing', show: false },
]

test('on the TV, Home uses the installed app list', async ({ page }) => {
  await page.addInitScript((apps) => localStorage.setItem('ourhome-mock-installed-apps', JSON.stringify(apps)), mockInstalledApps)
  await page.goto('/')

  // Installed catalog apps keep their tiles; uninstalled ones (Prime Video, Disney+…) are left out.
  await expect.poll(() => appNames(page)).toEqual(['Netflix', 'YouTube', 'Crave', 'All apps'])
  await expect(page.locator('.hero-card')).toBeFocused()

  // All apps shows installed apps, including ones not in the catalog, minus services and hidden apps.
  await page.getByRole('button', { name: 'All apps' }).click()
  const listed = await page.locator('.collection-text strong').allTextContents()
  expect(listed).toEqual(['Netflix', 'YouTube', 'Crave', 'CBC Gem'])

  // A newly found app can be added to Home.
  await page.getByRole('button', { name: 'Add CBC Gem to Home' }).click()
  await page.keyboard.press('Escape')
  await expect.poll(() => appNames(page)).toEqual(['Netflix', 'YouTube', 'Crave', 'CBC Gem', 'All apps'])

  // Installing Prime Video later makes the existing pin reappear when Home is shown again.
  await page.evaluate((apps) => {
    localStorage.setItem('ourhome-mock-installed-apps', JSON.stringify([...apps, { id: 'Abc1234567.prime', name: 'Prime Video', show: true }]))
    document.dispatchEvent(new Event('visibilitychange'))
  }, mockInstalledApps)
  await expect.poll(() => appNames(page)).toEqual(['Netflix', 'YouTube', 'Prime Video', 'Crave', 'CBC Gem', 'All apps'])
})

test('if the strict filter would hide everything, the looser one is used', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ourhome-mock-installed-apps', JSON.stringify([
    { id: 'com.samsung.tv.weird-format-one', name: 'Weird One', show: true },
    { id: 'com.samsung.tv.weird-format-two', name: 'Weird Two', show: true },
    { id: 'com.samsung.tv.some-service', name: 'Background service', show: true },
  ])))
  await page.goto('/')
  await page.getByRole('button', { name: 'All apps' }).click()
  expect(await page.locator('.collection-text strong').allTextContents()).toEqual(['Weird One', 'Weird Two'])
})

test('known apps show even when their TV ID looks like a system app', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ourhome-mock-installed-apps', JSON.stringify([
    { id: 'com.samsung.tv.netflix', name: 'Netflix', show: true },
    { id: 'Abc1234567.cbcgem', name: 'CBC Gem', show: true },
  ])))
  await page.goto('/')
  await expect.poll(() => appNames(page)).toEqual(['Netflix', 'All apps'])
})

test('if the TV fails to list apps, Home shows the reason and can retry', async ({ page }) => {
  await page.addInitScript(() => {
    const testWindow = window as unknown as { tizen: unknown; allowApps?: boolean }
    testWindow.tizen = {
      application: {
        getAppsInfo: (onSuccess: (apps: unknown[]) => void, onError: (error: unknown) => void) => {
          if (!testWindow.allowApps) onError({ name: 'SecurityError', message: 'Permission denied' })
          else onSuccess([{ id: 'Abc1234567.cbcgem', name: 'CBC Gem', show: true }])
        },
        launch: () => {},
      },
    }
  })
  await page.goto('/')
  await expect(page.locator('.hero-placeholder')).toContainText('Something went wrong')
  await expect(page.locator('.hero-error')).toHaveText('SecurityError: Permission denied')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeFocused()
  await page.evaluate(() => { (window as unknown as { allowApps: boolean }).allowApps = true })
  await page.keyboard.press('Enter')
  await expect(page.locator('.hero-name')).toHaveText('CBC Gem')
})

test('TV app objects whose fields are getters keep their IDs', async ({ page }) => {
  await page.addInitScript(() => {
    class TvAppInfo {
      #id: string
      #name: string
      constructor(id: string, name: string) { this.#id = id; this.#name = name }
      get id() { return this.#id }
      get name() { return this.#name }
      get show() { return true }
      get iconPath() { return '' }
    }
    ;(window as unknown as { tizen: unknown }).tizen = {
      application: {
        getAppsInfo: (onSuccess: (apps: unknown[]) => void) => onSuccess([new TvAppInfo('Abc1234567.cbcgem', 'CBC Gem')]),
        launch: () => {},
      },
    }
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'All apps' }).click()
  await expect(page.locator('.collection-text strong')).toHaveText(['CBC Gem'])
})

test('remote keys still work after the selected item disappears', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.hero-card')).toBeFocused()

  // Simulate losing focus (e.g. the selected tile was removed): the first arrow press recovers it.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('.hero-card')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('.shelf-row .app-tile:focus')).toHaveCount(1)

  // In Arrange Home, moving and removing an app keeps the selection on that app's controls.
  await page.getByRole('button', { name: 'All apps' }).click()
  await page.getByRole('button', { name: 'Arrange Home' }).click()
  await page.getByRole('button', { name: 'Move YouTube later' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Move YouTube later' })).toBeFocused()
  await page.getByRole('button', { name: 'Remove YouTube from Home' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Add YouTube to Home' })).toBeFocused()
  await page.keyboard.press('ArrowUp')
  const stillInDialog = await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))
  expect(stillInDialog).toBe(true)
})

test('app tiles are large', async ({ page }) => {
  await page.goto('/')
  const tile = await page.locator('.shelf-row .app-tile').first().boundingBox()
  expect(tile!.width).toBeGreaterThanOrEqual(300)
  expect(tile!.height).toBeGreaterThanOrEqual(190)
})

test('brand wordmarks load on Home and in All apps', async ({ page }) => {
  await page.goto('/')
  for (const id of ['prime-video', 'disney-plus', 'crave', 'tsn']) {
    const logo = page.locator(`.shelf-row [data-brand-logo="${id}"]`)
    await expect.poll(() => logo.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  }
  await page.getByRole('button', { name: 'All apps' }).click()
  for (const id of ['prime-video', 'disney-plus', 'crave', 'tsn']) {
    const logo = page.locator(`.collection-icon [data-brand-logo="${id}"]`)
    await expect.poll(() => logo.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    const box = await logo.boundingBox()
    const container = await logo.locator('..').boundingBox()
    expect(box!.width).toBeLessThanOrEqual(container!.width + 1)
  }
})

test('the TV layout scales to fit a laptop window', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const stage = await page.locator('.tv-stage').boundingBox()
  expect(stage!.width).toBeLessThanOrEqual(1440 + 1)
  expect(stage!.height).toBeLessThanOrEqual(900 + 1)
  expect(stage!.width / stage!.height).toBeCloseTo(16 / 9, 2)
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('.shelf-row .app-tile:focus')).toHaveCount(1)
  await page.screenshot({ path: 'test-results/home-laptop.png', animations: 'disabled' })
})

test('pins from the previous Parkside layout still migrate', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('parkside-favorite-order', JSON.stringify(['netflix', 'youtube', 'prime-video']))
    window.localStorage.setItem('parkside-hidden-apps', JSON.stringify(['youtube']))
  })
  await page.goto('/')
  expect(await appNames(page)).toEqual(['Netflix', 'Prime Video', 'All apps'])
})

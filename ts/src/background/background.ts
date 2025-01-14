import {
  OWGames,
  OWGameListener,
  OWGamesEvents,
  OWWindow
} from '@overwolf/overwolf-api-ts';

import { kWindowNames, kGameClassIds, kGamesFeatures, kGameListeners } from "../consts";

import RunningGameInfo = overwolf.games.RunningGameInfo;
import AppLaunchTriggeredEvent = overwolf.extensions.AppLaunchTriggeredEvent;

// The background controller holds all of the app's background logic - hence its name. it has
// many possible use cases, for example sharing data between windows, or, in our case,
// managing which window is currently presented to the user. To that end, it holds a dictionary
// of the windows available in the app.
// Our background controller implements the Singleton design pattern, since only one
// instance of it should exist.
class BackgroundController {
  private static _instance: BackgroundController;
  private _windows: Record<string, OWWindow> = {};
  private _gameListener: OWGameListener;
  private _gameEventsListener: OWGamesEvents;

  private constructor() {
    // Populating the background controller's window dictionary
    this._windows[kWindowNames.desktop] = new OWWindow(kWindowNames.desktop);
    this._windows[kWindowNames.inGame] = new OWWindow(kWindowNames.inGame);

    // When a a supported game game is started or is ended, toggle the app's windows
    this._gameListener = new OWGameListener({
      onGameStarted: this.toggleWindows.bind(this),
      onGameEnded: this.toggleWindows.bind(this)
    });

    overwolf.extensions.onAppLaunchTriggered.addListener(
      e => this.onAppLaunchTriggered(e)
    );
  };

  // Implementing the Singleton design pattern
  public static instance(): BackgroundController {
    if (!BackgroundController._instance) {
      BackgroundController._instance = new BackgroundController();
    }

    return BackgroundController._instance;
  }

  // When running the app, start listening to games' status and decide which window should
  // be launched first, based on whether a supported game is currently running
  public async run() {
    console.log('Background is started...');
    this._gameListener.start();

    await this.bindGameFutures();

    // const currWindowName = (await this.isSupportedGameRunning())
    //   ? kWindowNames.inGame
    //   : kWindowNames.desktop;

    // if (await this.isSupportedGameRunning()) {
    //   this._windows[kWindowNames.inGame].restore();
    // }
  }

  private async bindGameFutures() {
    if (await this.isSupportedGameRunning()) {
      const info = await OWGames.getRunningGameInfo();
      const gameFeatures = kGamesFeatures.get(info.classId);

      this._gameEventsListener = new OWGamesEvents(
        {
          onInfoUpdates: kGameListeners[info.classId].onInfoUpdate.bind(kGameListeners[info.classId]),
          onNewEvents: kGameListeners[info.classId].onEvent.bind(kGameListeners[info.classId])
        },
        gameFeatures
      );
      this._gameEventsListener.start();
    }
  }

  private async onAppLaunchTriggered(e: AppLaunchTriggeredEvent) {
    console.log('onAppLaunchTriggered():', e);

    // if (!e) {
    //   return;
    // }

    if (!e || e.origin.includes('gamelaunchevent')) {
      return;
    }

    await this.bindGameFutures();

    // if (await this.isSupportedGameRunning()) {
    //   this._windows[kWindowNames.desktop].close();
    //   this._windows[kWindowNames.inGame].restore();
    // } else {
    //   this._windows[kWindowNames.desktop].restore();
    //   this._windows[kWindowNames.inGame].close();
    // }
  }

  private onInfoUpdates(info) {
    // this.logLine(this._infoLog, info, false);
    console.log('onInfoUpdates(): ', info)
  }

  private onNewEvents(event) {
    console.log('onNewEvents(): ', event)
  }

  private toggleWindows(info: RunningGameInfo) {
    if (!info || !this.isSupportedGame(info)) {
      return;
    }

    // if (info.isRunning) {
    //   this._windows[kWindowNames.desktop].close();
    //   this._windows[kWindowNames.inGame].restore();
    // } else {
    //   this._windows[kWindowNames.desktop].restore();
    //   this._windows[kWindowNames.inGame].close();
    // }
  }

  private async isSupportedGameRunning(): Promise<boolean> {
    const info = await OWGames.getRunningGameInfo();

    return info && info.isRunning && this.isSupportedGame(info);
  }

  // Identify whether the RunningGameInfo object we have references a supported game
  private isSupportedGame(info: RunningGameInfo) {
    console.log(info.classId)
    return kGameClassIds.includes(info.classId);
  }
}

BackgroundController.instance().run();

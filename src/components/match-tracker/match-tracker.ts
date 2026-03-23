import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import localForage from 'localforage';
import '../icons/mana-icon';
import '../icons/mtg-symbols';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';

import { sharedStyles } from '../../styles/shared-styles';
import { shoelaceStyles } from '../../styles/shoelace-styles';
import { counterStyles } from '../../pages/app-counter/counter-styles';
import { tableStyles } from '../../styles/table-styles';
import { manaStyles } from '../../styles/mana-styles';

interface Player {
  life: number;
}

interface Game {
  player1: string;
  player2: string;
  player3: string;
  player4: string;
  result: 'win' | 'loss' | 'draw';
  winner: string | "draw" | null;
}

interface MatchResult {
  player1Handle: string;
  player2Handle: string;
  player3Handle: string;
  player4Handle: string;
  player1LifeTracker: number;
  player2LifeTracker: number;
  player3LifeTracker: number;
  player4LifeTracker: number;
  player1Outcome: 'win' | 'loss' | 'draw';
  player2Outcome: 'win' | 'loss' | 'draw';
  player3Outcome: 'win' | 'loss' | 'draw';
  player4Outcome: 'win' | 'loss' | 'draw';
}

interface LogEntry {
  player: string;
  action: string;
  life: number;
}

@customElement('match-tracker')
export class MatchTracker extends LitElement {
  @property({ type: Object }) handle1: Player = { life: 40 };
  @property({ type: Object }) handle2: Player = { life: 40 };
  @property({ type: Object }) handle3: Player = { life: 40 };
  @property({ type: Object }) handle4: Player = { life: 40 };

  @state() activeTab: string = 'standings'; // Initial active tab
  @state() matchResults: MatchResult[] = []; // Array to store game results
  @state() playerHandle1: string = "Player 1";
  @state() playerHandle2: string = "Player 2";
  @state() playerHandle3: string = "Player 3";
  @state() playerHandle4: string = "Player 4";
  @state() initialLifeTracker: number = 40;
  @state() isAlertOpen = false; //Add a state to track if the drawer is open.

  @query('.alert-closable') alert: any; // Query for the drawer element

  private storageKey = 'playerData'; // Key for localForage

  @property({ type: Array }) gameHistory: Game[] = [];

  constructor() {
    super();
    this.loadFromStorage(); // Load data when component initializes
  }

  firstUpdated() { // Called after the first render
      this.saveToStorage(); // Save initial data to storage.
  }

  static styles = [
    sharedStyles,
    shoelaceStyles,
    tableStyles,
    counterStyles,
    manaStyles,
    css`
      main {
        height: calc(100vh - 80px);
        padding: 0;
        margin: 0;
        overflow: hidden;
      }

      .wrapper {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      sl-tab-group {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      sl-tab-panel[name="tracker"] {
        height: 100%;
        overflow: auto;
      }

      .tracker-grid {
        height: 100%;
        display: flex;
        flex-wrap: wrap;
      }

      .player-column {
        width: 50%;
        display: flex;
        flex-direction: column;
      }

      sl-input::part(form-control-help-text) {
        color: var(--sl-color-neutral-700);
      }
      .form-2-column {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .form-player-input {
        width: 100%;
        margin-right: 1rem;
        margin-left: 1rem;
      }
      @media (min-width: 950px) {
        .form-2-column {
          flex-direction: row;
        }
      }
      @media (max-width: 950px) {
        .form-player-input {
          margin-right: 0;
          margin-left: 0;
        }
      }
      sl-button.life-counter::part(base) {
        height: 4rem;
        justify-content: center;
        line-height: 4rem;
      }
    `
  ]
  @state() playerLogs: LogEntry[] = [];

  @state() playerHandle1Actions: string[] = []; // Array to store Player 1's actions
  @state() playerHandle2Actions: string[] = []; // Array to store Player 2's actions
  @state() playerHandle3Actions: string[] = []; // Array to store Player 3's actions
  @state() playerHandle4Actions: string[] = []; // Array to store Player 4's actions

  setActiveTab(tabName: string) {
    this.activeTab = tabName;
  }

  private updateLife(player: 1 | 2 | 3 | 4, change: number, action: 'Gain' | 'Lose') {
    // Define a map to quickly access player data
    const playerMap = {
      1: { handle: this.handle1, playerHandle: this.playerHandle1, setter: (value: Player) => { this.handle1 = value; } },
      2: { handle: this.handle2, playerHandle: this.playerHandle2, setter: (value: Player) => { this.handle2 = value; } },
      3: { handle: this.handle3, playerHandle: this.playerHandle3, setter: (value: Player) => { this.handle3 = value; } },
      4: { handle: this.handle4, playerHandle: this.playerHandle4, setter: (value: Player) => { this.handle4 = value; } },
    };

    const playerData = playerMap[player];

    if (playerData) {
        // Update the life total, ensuring it doesn't go below 0
        const newLife = Math.max(0, playerData.handle.life + change);

        // Update the player state
        playerData.setter({...playerData.handle, life: newLife});

        // Log the action
        console.log(`${action} ${Math.abs(change)} to ${newLife} for ${playerData.playerHandle}`);

        // Record the action
        // playerData.actions = [...playerData.actions, `${action} ${Math.abs(change)} to ${newLife}`];
        this.playerLogs = [...this.playerLogs, { player: playerData.playerHandle, action: `${action}`, life: newLife }];

        //Update the main storage
        this.saveToStorage();
    }
  }

  private getPlayerIconVariant(game: LogEntry): string | undefined {
    if (game.action.includes("Lose")) {
      return 'loyalty-down';
    } else if (game.action.includes("Gain")) {
      return 'loyalty-up';
    } else {
      return undefined;
    }
  }
  private getPlayerBadgeVariant(game: LogEntry): string | undefined {
    if (game.action.includes("Lose")) {
      return 'danger';
    } else if (game.action.includes("Gain")) {
      return 'success';
    } else {
      return undefined;
    }
  }

  private setInitialLifeTracker(event: CustomEvent) {
    const input = event.target as HTMLInputElement;
    const newLife = parseInt(input.value, 10);

    if (!isNaN(newLife) && newLife >= 0) {
      this.initialLifeTracker = newLife;
      this.handle1 = { life: newLife };
      this.handle2 = { life: newLife };
      this.handle3 = { life: newLife };
      this.handle4 = { life: newLife };
      this.saveToStorage(); // Save after initial life change
    } else {
      alert("Please enter a valid positive number for starting life.");
      input.value = this.initialLifeTracker.toString();
    }
  }

  private handlePlayerHandleChange(player: 1 | 2 | 3 | 4, event: CustomEvent) {
    const playerMap = {
      1: { name: "Player 1", setter: (value: string) => { this.playerHandle1 = value; } },
      2: { name: "Player 2", setter: (value: string) => { this.playerHandle2 = value; } },
      3: { name: "Player 3", setter: (value: string) => { this.playerHandle3 = value; } },
      4: { name: "Player 4", setter: (value: string) => { this.playerHandle4 = value; } },
    };

    const playerData = playerMap[player];

    if (playerData) {
      const newName = (event.target as HTMLInputElement).value || playerData.name;
      playerData.setter(newName);
      this.saveToStorage();
    }
  }

  private recordResult(winner: 1 | 2 | 3 | 4 | 'draw') {
    let player1Outcome: 'win' | 'loss' | 'draw' = 'loss';
    let player2Outcome: 'win' | 'loss' | 'draw' = 'loss';
    let player3Outcome: 'win' | 'loss' | 'draw' = 'loss';
    let player4Outcome: 'win' | 'loss' | 'draw' = 'loss';

    if (winner === 1) {
      player1Outcome = 'win';
      player2Outcome = 'loss';
      player3Outcome = 'loss';
      player4Outcome = 'loss';
    } else if (winner === 2) {
      player1Outcome = 'loss';
      player2Outcome = 'win';
      player3Outcome = 'loss';
      player4Outcome = 'loss';
    } else if (winner === 3) {
      player1Outcome = 'loss';
      player2Outcome = 'loss';
      player3Outcome = 'win';
      player4Outcome = 'loss';
    } else if (winner === 4) {
      player1Outcome = 'loss';
      player2Outcome = 'loss';
      player3Outcome = 'loss';
      player4Outcome = 'win';
    } else if (winner === 'draw') {
      player1Outcome = 'draw';
      player2Outcome = 'draw';
      player3Outcome = 'draw';
      player4Outcome = 'draw';
    }

    const newResult: MatchResult = {
      player1Handle: this.playerHandle1,
      player2Handle: this.playerHandle2,
      player3Handle: this.playerHandle3,
      player4Handle: this.playerHandle4,
      player1LifeTracker: this.handle1.life,
      player2LifeTracker: this.handle2.life,
      player3LifeTracker: this.handle3.life,
      player4LifeTracker: this.handle4.life,
      player1Outcome,
      player2Outcome,
      player3Outcome,
      player4Outcome,
    };

    this.matchResults = [...this.matchResults, newResult];
    this.saveToStorage();
    this.resetLife(); // Reset the game for a new round
  }

  private closeAlert(){
    this.isAlertOpen = false;
  }
  private resetWithAlert(){
    this.resetGame();
    this.isAlertOpen = true;
  }

  private resetGame() {
      this.handle1 = { life: this.initialLifeTracker };
      this.handle2 = { life: this.initialLifeTracker };
      this.handle3 = { life: this.initialLifeTracker };
      this.handle4 = { life: this.initialLifeTracker };
      this.playerLogs = [];
      this.playerHandle1 = "Player 1";
      this.playerHandle2 = "Player 2";
      this.playerHandle3 = "Player 3";
      this.playerHandle4 = "Player 4";
      this.matchResults = [];
  }
  private resetLife() {
      this.handle1 = { life: this.initialLifeTracker };
      this.handle2 = { life: this.initialLifeTracker };
      this.handle3 = { life: this.initialLifeTracker };
      this.handle4 = { life: this.initialLifeTracker };
      this.playerLogs = [];
  }

  private saveToStorage() {
    const data = {
      initialLifeTracker: this.initialLifeTracker,
      matchResults: this.matchResults,
      handle1: this.handle1,
      handle2: this.handle2,
      handle3: this.handle3,
      handle4: this.handle4,
      playerHandle1: this.playerHandle1,
      playerHandle2: this.playerHandle2,
      playerHandle3: this.playerHandle3,
      playerHandle4: this.playerHandle4,
      playerLogs: this.playerLogs,
    };
    localForage.setItem(this.storageKey, data).catch(console.error);
  }

  private loadFromStorage() {
    localForage.getItem(this.storageKey).then((data: any) => {
      if (data) {
        this.initialLifeTracker = data.initialLifeTracker || 20;
        this.matchResults = data.matchResults || [];
        this.handle1 = data.handle1 || { life: 20 };
        this.handle2 = data.handle2 || { life: 20 };
        this.handle3 = data.handle3 || { life: 20 };
        this.handle4 = data.handle4 || { life: 20 };
        this.playerHandle1 = data.playerHandle1 || "Player 1";
        this.playerHandle2 = data.playerHandle2 || "Player 2";
        this.playerHandle3 = data.playerHandle3 || "Player 3";
        this.playerHandle4 = data.playerHandle4 || "Player 4";
        this.playerHandle1Actions = data.playerHandle1Actions || [];
        this.playerHandle2Actions = data.playerHandle2Actions || [];
        this.playerHandle3Actions = data.playerHandle3Actions || [];
        this.playerHandle4Actions = data.playerHandle4Actions || [];
        this.playerLogs = data.playerLogs;
      }
    }).catch(console.error);
  }

  private getPlayerStats(playerHandle: string) {
    const playerResults = this.matchResults.filter(
      (result) => result.player1Handle === playerHandle || result.player2Handle === playerHandle || result.player3Handle === playerHandle || result.player4Handle === playerHandle
    );

    const wins = playerResults.filter(
      (result) =>
        (result.player1Handle === playerHandle && result.player1Outcome === 'win') ||
        (result.player2Handle === playerHandle && result.player2Outcome === 'win') ||
        (result.player3Handle === playerHandle && result.player3Outcome === 'win') ||
        (result.player4Handle === playerHandle && result.player4Outcome === 'win')
    ).length;

    const losses = playerResults.filter(
      (result) =>
        (result.player1Handle === playerHandle && result.player1Outcome === 'loss') ||
        (result.player2Handle === playerHandle && result.player2Outcome === 'loss') ||
        (result.player3Handle === playerHandle && result.player3Outcome === 'loss') ||
        (result.player4Handle === playerHandle && result.player4Outcome === 'loss')
    ).length;

    const draws = playerResults.filter(
      (result) =>
        (result.player1Handle === playerHandle && result.player1Outcome === 'draw') ||
        (result.player2Handle === playerHandle && result.player2Outcome === 'draw') ||
        (result.player3Handle === playerHandle && result.player3Outcome === 'draw') ||
        (result.player4Handle === playerHandle && result.player4Outcome === 'draw')
    ).length;

    return { wins, losses, draws };
  }

  private exportToCSV() {
    const csvContent = "data:text/csv;charset=utf-8," + this.convertArrayOfObjectsToCSV(this.matchResults);

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "game_results.csv"); // Set the filename
    document.body.appendChild(link); // Required for FF
    link.click(); // Simulate click to download
    document.body.removeChild(link); // Clean up
  }

  private exportToJSON() {
    const games = this.matchResults.map((result, index) => {
      const players = [
        { id: 'player-1', name: result.player1Handle, seat: 1 },
        { id: 'player-2', name: result.player2Handle, seat: 2 },
        { id: 'player-3', name: result.player3Handle, seat: 3 },
        { id: 'player-4', name: result.player4Handle, seat: 4 },
      ];

      const winnerIndex = ['win', 'win', 'win', 'win'].indexOf(result.player1Outcome) >= 0 
        ? 0 
        : ['win', 'win', 'win', 'win'].indexOf(result.player2Outcome) >= 0 
          ? 1 
          : ['win', 'win', 'win', 'win'].indexOf(result.player3Outcome) >= 0 
            ? 2 
            : ['win', 'win', 'win', 'win'].indexOf(result.player4Outcome) >= 0 
              ? 3 
              : null;

      return {
        id: `game-${Date.now()}-${index}`,
        version: '1.0.0',
        type: 'game',
        createdAt: new Date().toISOString(),
        meta: {
          format: 'commander',
          date: new Date().toISOString().split('T')[0],
          winningPlayerId: winnerIndex !== null ? players[winnerIndex].id : null,
          winningReason: winnerIndex !== null ? 'last_standing' : null,
        },
        players: players.map((p, i) => ({
          ...p,
          commander: null,
          isWinner: i === winnerIndex,
        })),
        finalState: {
          life: {
            'player-1': result.player1LifeTracker,
            'player-2': result.player2LifeTracker,
            'player-3': result.player3LifeTracker,
            'player-4': result.player4LifeTracker,
          },
          poison: {},
          commanderDamage: {},
        },
        defeatedPlayers: players
          .map((p, i) => {
            const outcome = [result.player1Outcome, result.player2Outcome, result.player3Outcome, result.player4Outcome][i];
            return outcome === 'loss' ? { playerId: p.id, playerName: p.name, reason: 'life' } : null;
          })
          .filter(Boolean),
      };
    });

    const exportData = {
      version: '1.0.0',
      type: 'batch',
      exportedAt: new Date().toISOString(),
      count: games.length,
      games: games,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mtg-commander-games.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private convertArrayOfObjectsToCSV(arr: any[]) {
    if (!arr || arr.length === 0) {
      return "";
    }

    const header = Object.keys(arr[0]).join(","); // Get header from keys
    const rows = arr.map(obj => {
      return Object.values(obj).map(value => `"${value}"`).join(","); // Escape values with quotes
    }).join("\n");

    return header + "\n" + rows;
  }

  render() {
    // Clear previous log items
    const playerLogItems = new Map<string, string[]>();

    this.playerLogs.forEach(log => {
        if (!playerLogItems.has(log.player)) {
            playerLogItems.set(log.player, []);
        }
        const iconName = this.getPlayerIconVariant(log);
        const badgeName = this.getPlayerBadgeVariant(log);
        const logItem = html`
          <sl-menu-item>
            ${iconName ? html`<sl-icon slot="prefix" library="mana" name=${String(iconName)}></sl-icon>` : nothing}
            ${log.action}
            ${badgeName ? html`<sl-badge variant=${String(badgeName)} pill>1</sl-badge>` : nothing} life to <sl-badge variant="neutral">${log.life}</sl-badge>
          </sl-menu-item>
        `;
        // @ts-ignore
        playerLogItems.get(log.player)?.push(logItem);
    });

    // Render menu items for each player
    const playerMenuItems = [];
    for (const [player, logs] of playerLogItems) {
        playerMenuItems.push(html`
           <sl-menu-label>${player}</sl-menu-label>
           ${logs.map(log => html`
            ${log}
           `)}
        `);
    }
    // Empty state logic
    const emptyState = html`
      <sl-menu-item disabled>
        <sl-icon slot="prefix" name="info-circle"></sl-icon>
        No match information to display.
      </sl-menu-item>
    `;

    const menuContent = playerMenuItems.length > 0 ? playerMenuItems : emptyState;

    return html`
      <main>
        <div class="wrapper">
          <sl-tab-group active-tab=${this.activeTab}>
            <sl-tab slot="nav" panel="tracker" class="ios-tab">Life</sl-tab>
            <sl-tab slot="nav" panel="results" class="ios-tab">Results</sl-tab>
            <sl-tab slot="nav" panel="standings" class="ios-tab">Standings</sl-tab>
            <sl-tab slot="nav" panel="action-log" class="ios-tab">Match Log</sl-tab>
            <sl-tab slot="nav" panel="setup" class="ios-tab">Setup</sl-tab>
            <sl-tab-panel name="tracker">
              <div class="tracker-grid">
                <div class="player-column">
                  <sl-card class="player-one" id="topLeft">
                    <form style="position: relative; height: 100%; justify-content: space-between;">
                      <sl-button variant="default" size="large" class="life-counter player-one" @click=${() => this.updateLife(1, 1, 'Gain')}>
                        <sl-icon src="/assets/icons/loyalty-up.svg" slot="prefix" class="ms ms-loyalty-up ms-2x"></sl-icon>
                        Gain
                      </sl-button>
                      <div>
                        <p class="text-center ms-4x" style="line-height: normal; margin: 0;">
                          ${this.handle1.life}
                        </p>
                        <p class="text-center" style="margin:0; padding:0;">
                          ${this.playerHandle1}
                        </p>
                      </div>
                      <sl-button variant="default" size="large" class="life-counter player-one" @click=${() => this.updateLife(1, -1, 'Lose')}>
                        <sl-icon src="/assets/icons/loyalty-down.svg" slot="prefix" class="ms ms-loyalty-down ms-2x"></sl-icon>
                        Lose
                      </sl-button>
                      <span class="hide-at-950" style="position: absolute; right: 8px; bottom: 8px;">
                        <sl-icon src="/assets/icons/saga.svg" slot="prefix" class="ms ms-saga-1 ms-4x"></sl-icon>
                      </span>
                    </form>
                  </sl-card>
                  <sl-card class="player-three" id="topRight">
                    <form style="position: relative; height: 100%; justify-content: space-between;">
                      <sl-button variant="default" size="large" class="life-counter player-three" @click=${() => this.updateLife(3, 1, 'Gain')}>
                        <sl-icon src="/assets/icons/loyalty-up.svg" slot="prefix" class="ms ms-loyalty-up ms-2x"></sl-icon>
                        Gain
                      </sl-button>
                      <div>
                        <p class="text-center ms-4x" style="line-height: normal; margin: 0;">
                          ${this.handle3.life}
                        </p>
                        <p class="text-center" style="margin:0; padding:0;">
                          ${this.playerHandle3}
                        </p>
                      </div>
                      <sl-button variant="default" size="large" class="life-counter player-three" @click=${() => this.updateLife(3, -1, 'Lose')}>
                        <sl-icon src="/assets/icons/loyalty-down.svg" slot="prefix" class="ms ms-loyalty-down ms-2x"></sl-icon>
                        Lose
                      </sl-button>
                      <span class="hide-at-950" style="position: absolute; right: 8px; top: 8px;">
                        <sl-icon src="/assets/icons/saga.svg" slot="prefix" class="ms ms-saga-3 ms-4x"></sl-icon>
                      </span>
                    </form>
                  </sl-card>
                </div>
                <div class="player-column">
                  <sl-card class="player-two" id="bottomLeft">
                    <form style="position: relative; height: 100%; justify-content: space-between;">
                      <sl-button variant="default" size="large" class="life-counter player-two" @click=${() => this.updateLife(2, 1, 'Gain')}>
                        <sl-icon src="/assets/icons/loyalty-up.svg" slot="prefix" class="ms ms-loyalty-up ms-2x"></sl-icon>
                        Gain
                      </sl-button>
                      <div>
                        <p class="text-center ms-4x" style="line-height: normal; margin: 0;">
                          ${this.handle2.life}
                        </p>
                        <p class="text-center" style="margin:0; padding:0;">
                          ${this.playerHandle2}
                        </p>
                      </div>
                      <sl-button variant="default" size="large" class="life-counter player-two" @click=${() => this.updateLife(2, -1, 'Lose')}>
                        <sl-icon src="/assets/icons/loyalty-down.svg" slot="prefix" class="ms ms-loyalty-down ms-2x"></sl-icon>
                        Lose
                      </sl-button>
                      <span class="hide-at-950" style="position: absolute; left: 8px; bottom: 8px;">
                        <sl-icon src="/assets/icons/saga.svg" slot="prefix" class="ms ms-saga-2 ms-4x"></sl-icon>
                      </span>
                    </form>
                  </sl-card>
                  <sl-card class="player-four" id="bottomRight">
                    <form style="position: relative; height: 100%; justify-content: space-between;">
                      <sl-button variant="default" size="large" class="life-counter player-four" @click=${() => this.updateLife(4, 1, 'Gain')}>
                        <sl-icon src="/assets/icons/loyalty-up.svg" slot="prefix" class="ms ms-loyalty-up ms-2x"></sl-icon>
                        Gain
                      </sl-button>
                      <div>
                        <p class="text-center ms-4x" style="line-height: normal; margin: 0;">
                          ${this.handle4.life}
                        </p>
                        <p class="text-center" style="margin:0; padding:0;">
                          ${this.playerHandle4}
                        </p>
                      </div>
                      <sl-button variant="default" outline size="large" class="life-counter player-four" @click=${() => this.updateLife(4, -1, 'Lose')}>
                        <sl-icon src="/assets/icons/loyalty-down.svg" slot="prefix" class="ms ms-loyalty-down ms-2x"></sl-icon>
                        Lose
                      </sl-button>
                      <span class="hide-at-950" style="position: absolute; left: 8px; top: 8px;">
                        <sl-icon src="/assets/icons/saga.svg" slot="prefix" class="ms ms-saga-4 ms-4x"></sl-icon>
                      </span>
                    </form>
                  </sl-card>
                </div>
              </div>
            </sl-tab-panel>
            <sl-tab-panel name="standings">
              <table class="border table-striped">
                <thead>
                  <tr>
                    <th style="text-align: left;">Player</th>
                    <th style="text-align: left;">Wins</th>
                    <th style="text-align: left;">Losses</th>
                    <th style="text-align: left;">Draws</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${this.playerHandle1}</td>
                    <td>${this.getPlayerStats(this.playerHandle1).wins}</td>
                    <td>${this.getPlayerStats(this.playerHandle1).losses}</td>
                    <td>${this.getPlayerStats(this.playerHandle1).draws}</td>
                  </tr>
                  <tr>
                    <td>${this.playerHandle2}</td>
                    <td>${this.getPlayerStats(this.playerHandle2).wins}</td>
                    <td>${this.getPlayerStats(this.playerHandle2).losses}</td>
                    <td>${this.getPlayerStats(this.playerHandle2).draws}</td>
                  </tr>
                  <tr>
                    <td>${this.playerHandle3}</td>
                    <td>${this.getPlayerStats(this.playerHandle3).wins}</td>
                    <td>${this.getPlayerStats(this.playerHandle3).losses}</td>
                    <td>${this.getPlayerStats(this.playerHandle3).draws}</td>
                  </tr>
                  <tr>
                    <td>${this.playerHandle4}</td>
                    <td>${this.getPlayerStats(this.playerHandle4).wins}</td>
                    <td>${this.getPlayerStats(this.playerHandle4).losses}</td>
                    <td>${this.getPlayerStats(this.playerHandle4).draws}</td>
                  </tr>
                </tbody>
              </table>
            </sl-tab-panel>
            <sl-tab-panel name="setup">
              <sl-alert variant="primary" open duration="1500" closable class="alert-closable" ?open=${this.isAlertOpen} @sl-after-hide=${this.closeAlert}>
                <sl-icon slot="icon" name="info-circle"></sl-icon>
                Resetting game data.
              </sl-alert>
              <div style="display: flex; flex-direction: row; justify-content: center; margin-bottom: .5rem;">
                <sl-input
                  type="number"
                  label="Starting Life"
                  size="medium"
                  pill
                  help-text="Enter a number greater than 0"
                  type="number"
                  value=${this.initialLifeTracker}
                  @sl-change=${this.setInitialLifeTracker}
                  min="0"
                  style="width: 15rem; text-align: center;"
                >
                </sl-input>
              </div>
              <div class="form-2-column">
                <form class="form-player-input">
                  <sl-input
                    type="text"
                    label="Player 1"
                    size="medium"
                    pill
                    clearable
                    placeholder="Add player name"
                    value=${this.playerHandle1}
                    @sl-change=${(e: CustomEvent) => this.handlePlayerHandleChange(1, e)}
                  >
                    <sl-icon library="mana" slot="prefix" name="saga" class="ms ms-saga-1 ms-small"></sl-icon>
                  </sl-input>
                  <sl-input
                    type="text"
                    label="Player 3"
                    size="medium"
                    clearable
                    pill
                    placeholder="Add player name"
                    value=${this.playerHandle3}
                    @sl-change=${(e: CustomEvent) => this.handlePlayerHandleChange(3, e)}
                  >
                    <sl-icon library="mana" slot="prefix" name="saga" class="ms ms-saga-3 ms-small"></sl-icon>
                  </sl-input>
                </form>
                <form class="form-player-input">
                  <sl-input
                    type="text"
                    label="Player 2"
                    size="medium"
                    clearable
                    pill
                    placeholder="Add player name"
                    value=${this.playerHandle2}
                    @sl-change=${(e: CustomEvent) => this.handlePlayerHandleChange(2, e)}
                  >
                    <sl-icon library="mana" slot="prefix" name="saga" class="ms ms-saga-2 ms-small"></sl-icon>
                  </sl-input>
                  <sl-input
                    type="text"
                    label="Player 4"
                    size="medium"
                    clearable
                    pill
                    placeholder="Add player name"
                    value=${this.playerHandle4}
                    @sl-change=${(e: CustomEvent) => this.handlePlayerHandleChange(4, e)}
                  >
                    <sl-icon library="mana" slot="prefix" name="saga" class="ms ms-saga-4 ms-small"></sl-icon>
                  </sl-input>
                </form>
              </div>
              <div style="display: flex; flex-direction: row; justify-content: center; padding-top: 1rem; gap: 1rem;">
                <sl-button variant="success" pill @click=${this.exportToCSV}>
                  <sl-icon name="file-earmark-excel-fill" slot="prefix"></sl-icon>
                  Export to CSV
                </sl-button>
                <sl-button variant="primary" pill @click=${this.exportToJSON}>
                  <sl-icon name="file-earmark-code-fill" slot="prefix"></sl-icon>
                  Export to JSON
                </sl-button>
                <sl-button variant="danger" pill @click=${this.resetWithAlert}>
                  <sl-icon name="x-square-fill" slot="prefix"></sl-icon>
                  Reset All
                </sl-button>
              </div>
            </sl-tab-panel>
            <sl-tab-panel name="action-log">
              <sl-menu>
                ${menuContent}
              </sl-menu>
            </sl-tab-panel>
            <sl-tab-panel name="results">
              <div class="results-buttons">
                  <sl-button size="medium" pill class="player-one-winner" @click=${() => this.recordResult(1)}>
                     ${this.playerHandle1} Wins
                  </sl-button>
                  <sl-button size="medium" pill class="player-two-winner" @click=${() => this.recordResult(2)}>
                    ${this.playerHandle2} Wins
                  </sl-button>
                  <sl-button size="medium" pill class="player-three-winner" @click=${() => this.recordResult(3)}>
                    ${this.playerHandle3} Wins
                  </sl-button>
                  <sl-button size="medium" pill class="player-four-winner" @click=${() => this.recordResult(4)}>
                    ${this.playerHandle4} Wins
                  </sl-button>
              </div>
              <div class="results-buttons-small">
                  <sl-icon-button src="assets/svg/shield-halved-solid.svg" @click=${() => this.recordResult(1)}></sl-icon-button>
                  <sl-icon-button src="assets/svg/shield-halved-solid.svg" @click=${() => this.recordResult(2)}></sl-icon-button>
                  <sl-icon-button src="assets/svg/shield-halved-solid.svg" @click=${() => this.recordResult(3)}></sl-icon-button>
                  <sl-icon-button src="assets/svg/shield-halved-solid.svg" @click=${() => this.recordResult(4)}></sl-icon-button>
              </div>
              <table class="border table-striped">
                <thead>
                  <tr>
                    <th style="text-align: left;">
                      ${this.playerHandle1}
                    <th style="text-align: left;">
                      ${this.playerHandle2}
                    </th>
                    <th style="text-align: left;">
                      ${this.playerHandle3}
                    </th>
                    <th style="text-align: left;">
                      ${this.playerHandle4}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${this.matchResults.map(
                    (result) => html`
                      <tr>
                        <td>${result.player1Outcome}</td>
                        <td>${result.player2Outcome}</td>
                        <td>${result.player3Outcome}</td>
                        <td>${result.player4Outcome}</td>
                      </tr>
                    `
                  )}
                </tbody>
              </table>
            </sl-tab-panel>
          </sl-tab-group>
        </div>
      </main>
    `;
  }
}

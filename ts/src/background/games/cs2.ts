const prettify = (data: any): string => {
    return JSON.stringify(data, undefined, 4);
};

export class CS2 {
    
    private just_launch: boolean = true;
    private last_game_phase: string = '';
    private is_ranked: boolean = false;
    private is_wingman: boolean = false;
    private round_status: string = '';
    private round_kills: number = 0;
    private previous_total_kills: number = 0

    private onEndRound() {
        if (this.is_ranked && (this.round_kills === 5 || this.round_kills === 2 && this.is_wingman)) {
            console.log('Ace!!!!!!!!!!')
        }
        console.log(this.round_kills + " kills on round\n\n");
        this.round_kills = 0;
    }

    public onEvent(e) {
        const other = e.events.some(event => {
            switch (event.name) {
                case 'kill':
                case 'death':
                case 'assist':
                case 'match_start':
                case 'match_end':
                case 'kill_feed':
                case 'round_end':
                case 'round_start':
                    return false;
            }

            return true;
        });

        e.events.some(event => {
            switch (event.name) {
                case 'kill':
                    this.round_kills += event.data - this.previous_total_kills;
                    this.previous_total_kills = event.data;
                    console.log("+1 kill");
                    break
                case 'round_end':
                    (async () => {
                        await this.delay(1500);
                        this.onEndRound();
                    })();
                    // console.log(event);
                    break
                case 'round_start':
                    this.round_kills = 0;
                    break
                case 'kill_feed':
                    break;
                    // console.log(prettify(event))
            }
            return true;
        });

        // this.logLine(this._eventsLog, e, shouldHighlight);
        if (!other) {
            return;
        }
        // console.log('CS2 onNewEvents(): ', e);
    };

    public onInfoUpdate(info) {
        // "Premier"
        // "Competitive"
        // "Wingman"

        // this.logLine(this._infoLog, info, false);

        if (!this.just_launch && this.last_game_phase !== 'intermission' && info.live_data?.game_phase && info.live_data.game_phase === 'live') {
            this.round_kills = 0;
            this.previous_total_kills = 0;
            console.log('Киллы были обнулены!');
        }

        if (info.live_data?.game_phase) {
            this.last_game_phase = info.live_data.game_phase
        }

        if (info.live_data?.game_phase) {
            console.log(info.live_data?.game_phase);
        }

        if (!this.just_launch && info.live_data?.game_phase === 'gameover') {
            (async () => {
                await this.delay(1500);
                this.onEndRound();
                console.log('Total kills on game: ', this.previous_total_kills)
                this.previous_total_kills = 0;
            })();
        }

        if (this.just_launch) {
            if (info.live_data?.provider) {
                let provider = JSON.parse(info.live_data.provider);
                if (this.previous_total_kills === 0) {
                    if (provider.player?.state?.round_kills && this.round_kills !== provider.player?.state?.round_kills) {
                        this.round_kills = provider.player.state.round_kills;
                    }
                    if (provider.player?.match_stats?.kills && this.previous_total_kills !== provider.player?.match_stats?.kills) {
                        this.previous_total_kills = provider.player?.match_stats?.kills;
                    }
                }
            }
            this.just_launch = false
        }

        if (info.match_info?.game_mode) {
            let game_mode: string = info.match_info?.game_mode;

            if (game_mode === 'null') {
                this.is_ranked = false;
                return;
            }

            switch (game_mode.split(' ')[0]) {
                case "Premier":
                case "Competitive":
                case "Wingman":
                    this.is_ranked = true;
                case "Wingman":
                    this.is_wingman = true;
                    break;
                case "Offline":
                default:
                    this.is_ranked = false;
            }

        }
        if (info.match_info?.is_ranked) {
            this.is_ranked = info.match_info.is_ranked;
        }
        // console.log('CS2 onInfoUpdates(): ', info)
    };

    private delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

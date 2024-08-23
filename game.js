class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.gameCode = data.gameCode;
        this.isPlayer1 = data.isPlayer1;
        this.socket = data.socket; // Pass the socket connection from the previous scene
    }

    preload() {
        this.load.image('player1', 'player1.png'); 
        this.load.image('player2', 'player2.png');
        this.load.image('platform', 'platform.png');
    }

    create() {
        // Create platform and players
        const platformWidth = this.cameras.main.width * 0.8;
        const platformHeight = 200;
        const platformX = this.cameras.main.centerX;
        const platformY = this.cameras.main.height - platformHeight / 2;

        // Create pause button
        this.pauseButton = this.add.image(this.cameras.main.width - 30, 30, 'pauseButton')
            .setOrigin(1, 0)
            .setInteractive()
            .setDisplaySize(40, 40);

        // Pause button event
        this.pauseButton.on('pointerdown', () => {
            this.showPauseMenu();
        });
        
        const platform = this.matter.add.rectangle(platformX, platformY, platformWidth, platformHeight, { isStatic: true });
        this.add.image(platformX, platformY, 'platform').setDisplaySize(platformWidth, platformHeight).setOrigin(0.5);

        const player1X = platformX - platformWidth / 2 + 50;
        const player1Y = platformY - platformHeight / 2 - 50;
        this.player1 = this.matter.add.sprite(player1X, player1Y, 'player1');
        this.player1.setFixedRotation();
        this.player1.setBounce(0.2);

        const player2X = platformX + platformWidth / 2 - 50;
        const player2Y = platformY - platformHeight / 2 - 50;
        this.player2 = this.matter.add.sprite(player2X, player2Y, 'player2');
        this.player2.setFixedRotation();
        this.player2.setBounce(0.2);

        this.cursors = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            jump: Phaser.Input.Keyboard.KeyCodes.SPACE
        });

        this.otherPlayer = this.isPlayer1 ? this.player2 : this.player1;

        // Socket.io event listeners
        this.socket.emit('joinGame', { gameCode: this.gameCode });

        this.socket.on('playerMoved', (data) => {
            this.otherPlayer.setPosition(data.x, data.y);
        });
    }

    update() {
        if (!this.socket || !this.socket.connected) return; // Skip update if not connected

        const player = this.isPlayer1 ? this.player1 : this.player2;
        this.handlePlayerMovement(player, this.cursors);

        // Emit player movement
        this.socket.emit('playerMove', {
            gameCode: this.gameCode,
            x: player.x,
            y: player.y
        });
    }

    handlePlayerMovement(player, cursors) {
        const speed = 5;

        if (cursors.left.isDown) {
            player.setVelocityX(-speed);
        } else if (cursors.right.isDown) {
            player.setVelocityX(speed);
        } else {
            player.setVelocityX(0);
        }

        if (cursors.up.isDown) {
            player.setVelocityY(-speed);
        } else if (cursors.down.isDown) {
            player.setVelocityY(speed);
        } else {
            player.setVelocityY(0);
        }

        if (cursors.jump.isDown && player.body.velocity.y === 0) {
            player.setVelocityY(-15);
        }
    }

    showPauseMenu() {
            // Create a pause menu background
            const pauseMenuBackground = this.add.graphics()
                .fillStyle(0x000000, 0.7)
                .fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

            // Create a menu container
            const menuContainer = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY);

            // Create "Leave" button
            const leaveButton = this.add.text(0, -40, 'Leave Game', { fontSize: '24px', fill: '#FFF' })
                .setOrigin(0.5)
                .setInteractive();

            leaveButton.on('pointerdown', () => {
                // Notify server that the player is leaving
                this.socket.emit('leaveGame', { gameCode: this.gameCode });

                // Stop the game and return to the title screen
                this.scene.stop('GameScene');
                this.scene.start('MenuScene');
            });

            menuContainer.add([leaveButton]);

            // Add back button to remove the pause menu
            const backButton = this.add.text(0, 40, 'Back', { fontSize: '24px', fill: '#FFF' })
                .setOrigin(0.5)
                .setInteractive();

            backButton.on('pointerdown', () => {
                pauseMenuBackground.destroy();
                menuContainer.destroy();
            });

            menuContainer.add(backButton);
        }
    }

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        // Load any additional assets if needed
    }

    create() {
        this.connectToServer(); // Establish the server connection when the MenuScene is created

        const title = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY - 100, 
            'PEAK GAME 2', 
            { fontSize: '32px', fill: '#FFF' }
        )
        .setOrigin(0.5)
        .setShadow(2, 2, '#000', 2, true, true);

        const playButton = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY - 20, 
            'Play', 
            { fontSize: '32px', fill: '#FFF' }
        )
        .setOrigin(0.5)
        .setInteractive();

        playButton.on('pointerdown', () => {
            this.showPlayOptions(title, playButton, optionsButton);
        });

        const optionsButton = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY + 40, 
            'Options', 
            { fontSize: '32px', fill: '#FFF' }
        )
        .setOrigin(0.5)
        .setInteractive();

        optionsButton.on('pointerdown', () => {
            this.showOptions(title, playButton, optionsButton);
        });
    }

    showPlayOptions(title, playButton, optionsButton) {
        if (title) title.destroy();
        if (playButton) playButton.destroy();
        if (optionsButton) optionsButton.destroy();

        const createRoomButton = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY - 20, 
            'Create Room', 
            { fontSize: '32px', fill: '#FFF' }
        )
        .setOrigin(0.5)
        .setInteractive();

        createRoomButton.on('pointerdown', () => {
            if (createRoomButton) createRoomButton.destroy();
            if (joinRoomButton) joinRoomButton.destroy();
            if (backButton) backButton.destroy();
            this.createRoom();
        });

        const joinRoomButton = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY + 40, 
            'Join Room', 
            { fontSize: '32px', fill: '#FFF' }
        )
        .setOrigin(0.5)
        .setInteractive();

        joinRoomButton.on('pointerdown', () => {
            if (createRoomButton) createRoomButton.destroy();
            if (joinRoomButton) joinRoomButton.destroy();
            if (backButton) backButton.destroy();
            this.showJoinRoomInput();
        });

        const backButton = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY + 100, 
            'Back', 
            { fontSize: '32px', fill: '#FFF' }
        )
        .setOrigin(0.5)
        .setInteractive();

        backButton.on('pointerdown', () => {
            if (createRoomButton) createRoomButton.destroy();
            if (joinRoomButton) joinRoomButton.destroy();
            if (backButton) backButton.destroy();
            this.create();
        });
    }

    createRoom() {
        const gameCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        this.socket.emit('createRoom', { gameCode });

        const gameCodeText = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY, 
            `Game Code: ${gameCode}`, 
            { fontSize: '24px', fill: '#FFF' }
        )
        .setOrigin(0.5);

        const waitingText = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY + 50, 
            'Waiting for Player 2...', 
            { fontSize: '24px', fill: '#FFF' }
        )
        .setOrigin(0.5);

        const backButton = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY + 100, 
            'Back', 
            { fontSize: '24px', fill: '#FFF' }
        )
        .setOrigin(0.5)
        .setInteractive();

        backButton.on('pointerdown', () => {
            if (gameCodeText) gameCodeText.destroy();
            if (waitingText) waitingText.destroy();
            if (backButton) backButton.destroy();
            this.showPlayOptions();
        });

        this.socket.on('player2Connected', () => {
            waitingText.setText('Player 2 Connected!');
            setTimeout(() => {
                this.scene.start('GameScene', { gameCode, isPlayer1: true, socket: this.socket });
            }, 1000);
        });
    }

    showJoinRoomInput() {
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.placeholder = 'Enter Game Code';
        inputElement.style.position = 'absolute';
        inputElement.style.left = `${this.cameras.main.centerX - 250}px`;
        inputElement.style.top = `${this.cameras.main.centerY - 100}px`;
        document.body.appendChild(inputElement);

        const joinRoomButton = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY + 40, 
            'Join', 
            { fontSize: '24px', fill: '#FFF' }
        )
        .setOrigin(0.5)
        .setInteractive();

        joinRoomButton.on('pointerdown', () => {
            const gameCode = inputElement.value;

            // Emit the joinRoom event with the gameCode to the server
            this.socket.emit('joinRoom', { gameCode });

            // Handle the roomJoined event from the server
            this.socket.on('roomJoined', () => {
                if (inputElement) document.body.removeChild(inputElement);
                this.scene.start('GameScene', { gameCode, isPlayer1: false, socket: this.socket });
            });

            // Handle errors (e.g., room does not exist or is invalid)
            this.socket.on('error', (errMsg) => {
                console.error(errMsg);

                // Display the invalid room message
                const invalidRoomText = this.add.text(
                    this.cameras.main.centerX, 
                    this.cameras.main.centerY - 100, 
                    'Invalid Room Code', 
                    { fontSize: '32px', fill: 'white' }
                ).setOrigin(0.5);

                this.time.delayedCall(4000, () => {
                    invalidRoomText.destroy();
                });
            });
        });

        const backButton = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY + 100, 
            'Back', 
            { fontSize: '24px', fill: '#FFF' }
        )
        .setOrigin(0.5)
        .setInteractive();

        backButton.on('pointerdown', () => {
            if (joinRoomButton) joinRoomButton.destroy();
            if (inputElement) document.body.removeChild(inputElement);
            if (backButton) backButton.destroy();
            this.showPlayOptions();
        });
    }

    connectToServer() {
        this.socket = io('https://ab66dc3b-2913-4585-898b-37955b89ae07-00-2ppfzzn9vea2f.pike.replit.dev/');
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
    }

    showOptions(title, playButton, optionsButton) {
        // Destroy the current title, play, and options buttons
        if (title) title.destroy();
        if (playButton) playButton.destroy();
        if (optionsButton) optionsButton.destroy();

        // Create the 'Game Settings' button
        const gameSettingsButton = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY - 60, 
            'Game Settings', 
            { fontSize: '24px', fill: '#FFF' }
        )
        .setOrigin(0.5)
        .setInteractive();

        // Create the 'Sound Settings' button
        const soundSettingsButton = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY, 
            'Sound Settings', 
            { fontSize: '24px', fill: '#FFF' }
        )
        .setOrigin(0.5)
        .setInteractive();

        // Create the 'Credits' button
        const creditsButton = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY + 60, 
            'Credits', 
            { fontSize: '24px', fill: '#FFF' }
        )
        .setOrigin(0.5)
        .setInteractive();

        // Create the 'Back' button
        const backButton = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY + 120, 
            'Back', 
            { fontSize: '24px', fill: '#FFF' }
        )
        .setOrigin(0.5)
        .setInteractive();

        // Handle 'Back' button click
        backButton.on('pointerdown', () => {
            // Destroy the options buttons
            gameSettingsButton.destroy();
            soundSettingsButton.destroy();
            creditsButton.destroy();
            backButton.destroy();

            // Return to the main menu
            this.create();
        });

        // Placeholder handlers for the settings and credits buttons
        gameSettingsButton.on('pointerdown', () => {
            console.log('Game Settings clicked');
            // Implement game settings logic here
        });

        soundSettingsButton.on('pointerdown', () => {
            console.log('Sound Settings clicked');
            // Implement sound settings logic here
        });

        creditsButton.on('pointerdown', () => {
            console.log('Credits clicked');
            // Implement credits logic here
        });
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: [MenuScene, GameScene],
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 0.5 }
        }
    }
};

const game = new Phaser.Game(config);
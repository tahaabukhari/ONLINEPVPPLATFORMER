class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.gameCode = data.gameCode;
        this.isPlayer1 = data.isPlayer1;
        this.socket = io();
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
}

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.socket = io('https://ab66dc3b-2913-4585-898b-37955b89ae07-00-2ppfzzn9vea2f.pike.replit.dev');
    }

    preload() {
        // Load any additional assets if needed
    }

    create() {
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

        const socket = io('https://ab66dc3b-2913-4585-898b-37955b89ae07-00-2ppfzzn9vea2f.pike.replit.dev');

        socket.on('connect', () => {
            console.log('Connected to server');
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
                this.scene.start('GameScene', { gameCode, isPlayer1: true });
            }, 1000);
        });
    }

    showJoinRoomInput() {
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.placeholder = 'Enter Game Code';
        inputElement.style.position = 'absolute';
        inputElement.style.left = `${this.cameras.main.centerX - 100}px`;
        inputElement.style.top = `${this.cameras.main.centerY}px`;
        document.body.appendChild(inputElement);

        const joinRoomButton = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY + 40, 
            'Join', 
            { fontSize: '32px', fill: '#FFF' }
        )
        .setOrigin(0.5)
        .setInteractive();

        joinRoomButton.on('pointerdown', () => {
            const gameCode = inputElement.value.toUpperCase();
            this.socket.emit('joinRoom', { gameCode });
            inputElement.remove();

            this.socket.on('roomJoined', () => {
                this.scene.start('GameScene', { gameCode, isPlayer1: false });
            });

            this.socket.on('error', (message) => {
                alert(message);
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
            inputElement.remove();
            if (joinRoomButton) joinRoomButton.destroy();
            if (backButton) backButton.destroy();
            this.showPlayOptions();
        });
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#2d2d2d',
    physics: {
        default: 'matter',
        matter: {
            gravity: {
                y: 1
            }
        }
    },
    scene: [MenuScene, GameScene]
};

const game = new Phaser.Game(config);
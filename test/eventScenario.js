const {loadFixture, takeSnapshot} = require('@nomicfoundation/hardhat-network-helpers');
const {time} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {expect} = require('chai');
const {JsonRpcProvider, Wallet, parseEther, formatUnits} = require("ethers");

const MIN_PARTICIPANTS = 4;
const HOUR_IN_SECONDS = 3600;
const DAY_IN_SECONDS = 86400;
const EVENT_FEE = parseEther("0.0010");
const ENDED_TIME_FRAME = 5 * HOUR_IN_SECONDS;
const CLOSING_TIME_FRAME = 24 * HOUR_IN_SECONDS;
const WITHDRAW_TIME_FRAME = 48 * HOUR_IN_SECONDS;
const MAX_AMOUNT_TO_RECAIM = BigInt(0.0040 * 1e18);
const MARION = 0;
const MARTIN = 1;
const JOHN = 2;
const MARIA = 3;
const MARC = 4;
const ELENA = 5;

const PARTICIPANTS_ARRAY = [
    {   // 0
        firstname: "Marion",
        lastname: "Feldhalter",
        email: "feldhalter@reher.hostingkunde.de",
        phone: "+49 176 3231242311",
        seats: 8,
    },
    {   // 1
        firstname: "Martin",
        lastname: "Schmitzt",
        email: "schmitzt@reher.hostingkunde.de",
        phone: "+49 176 2231555522",
        seats: 4,
    },
    {   // 2
        firstname: "John",
        lastname: "Smith",
        email: "smith@reher.hostingkunde.de",
        phone: "+49 176 1231242333",
        seats: 8,
    },
    {   // 3
        firstname: "Maria",
        lastname: "Schuster",
        email: "schuster@reher.hostingkunde.de",
        phone: "+49 176 2231242344",
        seats: 8,
    },
    {   // 4
        firstname: "Marc",
        lastname: "Foster",
        email: "foster@reher.hostingkunde.de",
        phone: "+49 178 1231252355",
        seats: 6,
    },
    {   // 5
        firstname: "Elena",
        lastname: "Raymann",
        email: "raymann@reher.hostingkunde.de",
        phone: "+49 178 1231252366",
        seats: 6,
    },
    {   // 5
        firstname: "Emma",
        lastname: "Hustel",
        email: "hustel@reher.hostingkunde.de",
        phone: "+49 178 1231252377",
        seats: 6,
    }
];

describe('EventScenario', function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployContractAndSetVariables() {
        const Event = await ethers.getContractFactory('Event');
        // Next Event
        const event = await Event.deploy(
            "First Cooking Event",
            "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed.",
            (await time.latest()) + (14 * DAY_IN_SECONDS),
            EVENT_FEE
        );
        const [owner, user1, user2, user3, user4, user5] = await ethers.getSigners();

        return {event, owner, user1, user2, user3, user4, user5};
    }

    describe('3-course barbecue menu near the city park', function () {
        it('six user register to the event', async function () {
            const {event, owner} = await loadFixture(deployContractAndSetVariables);
            await letParticipantsJoinsTheEvent(event, 6);
            expect(await event.participantCount()).to.equal(BigInt("6"));
        });

        it('one user leaves the event', async function () {
            const {event, owner, user1 } = await loadFixture(deployContractAndSetVariables);

            await letParticipantsJoinsTheEvent(event, 6);
            expect(await event.participantCount()).to.equal(BigInt("6"));
            await event.connect(user1).cancelParticipant();

            // Check that no participants are in the event
            expect(await event.participantCount()).to.equal(BigInt("5"));
        });

        it('the event will be clossed and distributed', async function () {
            const {event, owner, user1 } = await loadFixture(deployContractAndSetVariables);

            // six user will join the event
            await letParticipantsJoinsTheEvent(event, 6);
            expect(await event.eventStatus()).to.equal("0");
            expect(await event.participantCount()).to.equal(BigInt("6"));

            // one user will leave the event
            await event.connect(user1).cancelParticipant();
            expect(await event.participantCount()).to.equal(BigInt("5"));

            // time advance, so the event will be closed
            await time.increaseTo((await event.getEventClosingTime()));

            // the participants will see their roles
            await event.distributeEvent();
            expect(await event.eventStatus()).to.equal("1");
        });

        it('the participants can confirm among each other', async function () {
            const {event, owner, user1, user2, user3, user4, user5, user6 } = await loadFixture(deployContractAndSetVariables);

            // six user will join the event
            await letParticipantsJoinsTheEvent(event, 5);
            expect(await event.eventStatus()).to.equal("0");
            expect(await event.participantCount()).to.equal(BigInt("5"));

            // one user will leave the event
            await event.connect(user1).cancelParticipant();
            expect(await event.participantCount()).to.equal(BigInt("4"));

            // time advance, so the event will be closed
            await time.increaseTo((await event.getEventClosingTime()));

            // the participants will see their roles
            await event.distributeEvent();
            expect(await event.eventStatus()).to.equal("1");

            await time.increaseTo((await event.eventDate() + BigInt(ENDED_TIME_FRAME) - BigInt(30)));

            // the event users confirmed that they participate
            await event.connect(owner).confirmParticipation(user3.address);
            await event.connect(user2).confirmParticipation(user4.address);
            await event.connect(user2).confirmParticipation(owner.address);
            await event.connect(user3).confirmParticipation(user2.address);
            // check if function works
            expect(await event.connect(user2).isConfirmed()).to.true;
        });

        it('the participants enter their expenses for the evening', async function () {
            const {event, owner, user1, user2, user3, user4, user5, user6 } = await loadFixture(deployContractAndSetVariables);

            // six user will join the event
            await letParticipantsJoinsTheEvent(event, 5);
            expect(await event.eventStatus()).to.equal("0");
            expect(await event.participantCount()).to.equal(BigInt("5"));

            // one user will leave the event
            await event.connect(user1).cancelParticipant();
            expect(await event.participantCount()).to.equal(BigInt("4"));

            // time advance, so the event will be closed
            await time.increaseTo((await event.getEventClosingTime()));

            // the participants will see their roles
            await event.distributeEvent();
            expect(await event.eventStatus()).to.equal("1");

            await time.increaseTo((await event.eventDate()));

            // the participants can enter there expenses for the evening
            await event.connect(owner).reclaimExpenses(parseEther("0"));
            await event.connect(user2).reclaimExpenses(parseEther("0.0034"));
            await event.connect(user3).reclaimExpenses(parseEther("0.0025"));
            await event.connect(user4).reclaimExpenses(parseEther("0.0019"));
            // Check if the correct amount is send to the contract
            let [user4Expenses, user4Reclaimed] = await event.connect(user4).getUserExpenses();
            expect(user4Expenses).to.equal(parseEther("0.0019"));
            expect(user4Reclaimed).to.be.true;

            await time.increaseTo((await event.eventDate() + BigInt(ENDED_TIME_FRAME) - BigInt(30)));
        });

        it('the event is over. participants can widthdraw their deposit  minus the event compensation', async function () {
            const {event, owner, user1, user2, user3, user4, user5, user6 } = await loadFixture(deployContractAndSetVariables);

            // six user will join the event
            await letParticipantsJoinsTheEvent(event, 5);
            expect(await event.eventStatus()).to.equal("0");
            expect(await event.participantCount()).to.equal(BigInt("5"));

            // one user will leave the event
            await event.connect(user1).cancelParticipant();
            expect(await event.participantCount()).to.equal(BigInt("4"));

            // time advance, so the event will be closed
            await time.increaseTo((await event.getEventClosingTime()));

            // the participants will see their roles
            await event.distributeEvent();
            expect(await event.eventStatus()).to.equal("1");

            await time.increaseTo((await event.eventDate()));

            // the participants can enter there expenses for the evening
            await event.connect(owner).reclaimExpenses(parseEther("0"));
            await event.connect(user2).reclaimExpenses(parseEther("0.0004"));
            await event.connect(user3).reclaimExpenses(parseEther("0.0015"));
            await event.connect(user4).reclaimExpenses(parseEther("0.0019"));
            // Check if the correct amount is send to the contract
            let [user4Expenses, user4Reclaimed] = await event.connect(user4).getUserExpenses();
            expect(user4Expenses).to.equal(parseEther("0.0019"));
            expect(user4Reclaimed).to.be.true;

            await time.increaseTo((await event.eventDate() + BigInt(ENDED_TIME_FRAME) - BigInt(30)));

            // the event users confirmed that they participate
            await event.connect(owner).confirmParticipation(user3.address);
            await event.connect(user2).confirmParticipation(user4.address);
            await event.connect(user2).confirmParticipation(owner.address);
            await event.connect(user3).confirmParticipation(user2.address);
            // check if function works
            expect(await event.connect(user2).isConfirmed()).to.true;

            await time.increaseTo((await event.eventDate() + BigInt(ENDED_TIME_FRAME) + BigInt(30)));

            // the participants withdraw their money, minus an event compensation
            await event.connect(owner).withdraw();
            await event.connect(user2).withdraw();
            await event.connect(user3).withdraw();
            await event.connect(user4).withdraw();
            // expect(await event.connect(user4).getMyEventCompensation()).to.equal(parseEther("0.0005"));
            expect(await event.connect(user4).getWithDraw()).to.be.true;
        });

    });

    async function letParticipantsJoinsTheEvent(event, count) {
        userSigner = await ethers.getSigners();
        for(let userCount=0; userCount < count; userCount++) {
            await letOneParticipantJoinsTheEvent(event, userCount, userSigner[userCount]);
        }
    }

    async function letOneParticipantJoinsTheEvent(event, userCount, connectedUser) {
        await event.connect(connectedUser).joinEvent(
            PARTICIPANTS_ARRAY[userCount].firstname,
            PARTICIPANTS_ARRAY[userCount].lastname,
            PARTICIPANTS_ARRAY[userCount].email,
            PARTICIPANTS_ARRAY[userCount].phone,
            PARTICIPANTS_ARRAY[userCount].seats,
            {value: EVENT_FEE}
        );
    }

    async function printOutBalances(message) {
        console.log(message);
        const balanceEvent = await ethers.provider.getBalance(event.getAddress());
        console.log("balanceEvent", balanceEvent);
        const balance0ETH = await ethers.provider.getBalance(owner.address);
        console.log("balance0ETH", balance0ETH);
        const balance1ETH = await ethers.provider.getBalance(user1.address);
        console.log("balance1ETH", balance1ETH);
        const balance2ETH = await ethers.provider.getBalance(user2.address);
        console.log("balance2ETH", balance2ETH);
        const balance3ETH = await ethers.provider.getBalance(user3.address);
        console.log("balance3ETH", balance3ETH);

        // const balanceEvent_start = await ethers.provider.getBalance(event.getAddress());
        // const balance0ETH_start = await ethers.provider.getBalance(owner.address);
        // const balance1ETH_start = await ethers.provider.getBalance(user1.address);
        // const balance2ETH_start = await ethers.provider.getBalance(user2.address);
        // const balance3ETH_start = await ethers.provider.getBalance(user3.address);
        // const balance4ETH_start = await ethers.provider.getBalance(user4.address);
    }
});
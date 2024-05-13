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

describe('Event', function () {
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

        // Next Event
        const event2 = await Event.deploy(
            "Second Cooking Event",
            "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed.",
            (await time.latest()) + (5 * DAY_IN_SECONDS),
            EVENT_FEE
        );

        const [owner, user1, user2, user3, user4, user5] = await ethers.getSigners();

        // console.log('Signer 1 address: ', owner.address);
        // console.log('Event contract address: ', await event.getAddress());
        // console.log('Event contract address: ', await event2.getAddress());
        return {event, event2, owner, user1, user2, user3, user4, user5};
    }


    describe('Basic event tests', function () {
        // "I want it to x.", "I want it to y."
        it('should deploy and set the owner correctly', async function () {
            const {event, owner} = await loadFixture(deployContractAndSetVariables);

            expect(await event.owner()).to.equal(owner.address);
        });

        it('should be tested that the title and the description exists and be correct', async function () {
            const {event} = await loadFixture(deployContractAndSetVariables);

            expect(await event.title()).to.equal("First Cooking Event");
            expect(await event.description()).to.equal("Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed.");

            // Checking the Event Status
            // TODO: How can we reuse the enum from the contract?
            const active = BigInt("0"); // Active
            let eventStatusFromContract = await event.eventStatus();
            expect(eventStatusFromContract).to.equal(active);
        });

        it('test letParticipantsJoinsTheEvent', async function () {
            const {event, user2, user3} = await loadFixture(deployContractAndSetVariables);
            await letParticipantsJoinsTheEvent(event, 5);
            expect(await event.participantCount()).to.equal(BigInt("5"));
        });

        it('should be tested, that a user can only entered once', async function () {
            const {event, user1, user2, user3} = await loadFixture(deployContractAndSetVariables);

            await letOneParticipantJoinsTheEvent(event, JOHN, user1);

            await expect(
                letOneParticipantJoinsTheEvent(event, MARION, user1)
            ).to.be.revertedWith("The user have already joined the event");

            await letOneParticipantJoinsTheEvent(event, MARION, user2);
        });

        it('shoud be tested that event status changes correctly', async function () {
            const {event, user2} = await loadFixture(deployContractAndSetVariables);

            expect(await event.eventStatus()).to.equal("0");
            await event.setEventStatus(3);
            expect(await event.eventStatus()).to.equal("3");
            await expect(event.connect(user2).setEventStatus(4)).to.be.reverted;
            expect(await event.eventStatus()).to.equal("3");
            // TODO: Find a way to test values out of bound of the enum
            await expect(event.connect(user2).setEventStatus(8)).to.be.reverted;
            expect(await event.eventStatus()).to.equal("3");

            await expect(
                letOneParticipantJoinsTheEvent(event, MARION, user2)
            ).to.be.revertedWith("This event isn't active anymore");
        });

        it('should be tested that events closed correctly', async function () {
            const {event2, user2, user3} = await loadFixture(deployContractAndSetVariables);

            let timeNow = await time.latest();
            await letOneParticipantJoinsTheEvent(event2, MARION, user2);

            await time.increaseTo((await event2.getEventClosingTime()));

            await expect(
                letOneParticipantJoinsTheEvent(event2, MARION, user3)
            ).to.be.revertedWith("This event is closed");
        });
    });

    describe('Joining an event', function () {

        it('should be tested that participants can join the events', async function () {
            const {event, user1, user2, user3, user4, user5} = await loadFixture(deployContractAndSetVariables);

            await letOneParticipantJoinsTheEvent(event, JOHN, user1);
            expect(await event.participantCount()).to.equal(BigInt("1"));
            await letOneParticipantJoinsTheEvent(event, MARIA, user2);
            expect(await event.participantCount()).to.equal(BigInt("2"));
            await letOneParticipantJoinsTheEvent(event, MARC, user3);
            expect(await event.participantCount()).to.equal(BigInt("3"));
            await letOneParticipantJoinsTheEvent(event, MARTIN, user4);
            expect(await event.participantCount()).to.equal(BigInt("4"));
            await letOneParticipantJoinsTheEvent(event, MARION, user5);
            expect(await event.participantCount()).to.equal(BigInt("5"));
        });

        it('should be tested that the event seats restrictions works', async function () {
            const {event, owner, user1, user2, user3, user4, user5} = await loadFixture(deployContractAndSetVariables);

            await letOneParticipantJoinsTheEvent(event, MARTIN, user3);
            expect(await event.eventSeats()).to.equal(BigInt(4));
            await letOneParticipantJoinsTheEvent(event, MARION, user1);
            await letOneParticipantJoinsTheEvent(event, JOHN, user2);
            await letOneParticipantJoinsTheEvent(event, MARIA, user5);

            await expect(
                letOneParticipantJoinsTheEvent(event, MARC, user4)
            ).to.be.revertedWith("There are no more seats");

            await expect(
                letOneParticipantJoinsTheEvent(event, JOHN, owner)
            ).to.be.revertedWith("There are no more seats");
        });

        it('should be checked that the minimum event seats is right', async function () {
            const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);

            // TODO: expand the function letOneParticipantJoinsTheEvent with the possibility to override the sending ether
            await expect(
                event.connect(user1).joinEvent(
                    "Mario",
                    "Feldhalter",
                    "feldhalter@reher.hostingkunde.de",
                    "+49 176 3231242343",
                    2,
                    {value: EVENT_FEE}
                )
            ).to.be.revertedWith("The minimum seats are four");

            await letOneParticipantJoinsTheEvent(event, MARTIN, user4);
            expect(await event.eventSeats()).to.equal(BigInt(4));
        });

        it('should prevent to enter the event without the incorrect event fee', async function () {
            const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);

            // TODO: expand the function letOneParticipantJoinsTheEvent with the possibility to override the sending ether
            await expect(
                event.connect(user4).joinEvent(
                    "John",
                    "Smith",
                    "smith@reher.hostingkunde.de",
                    "+49 176 1231242341",
                    8,
                    {value: EVENT_FEE + parseEther("0.0020")},
                )
            ).to.be.revertedWith("The correct eventFee has to be paid");
            expect(await event.participantCount()).to.equal(BigInt("0"));

            // TODO: expand the function letOneParticipantJoinsTheEvent with the possibility to override the sending ether
            await expect(
                event.connect(user4).joinEvent(
                    "John",
                    "Smith",
                    "smith@reher.hostingkunde.de",
                    "+49 176 1231242341",
                    8,
                    {value: EVENT_FEE - parseEther("0.00055")},
                )
            ).to.be.revertedWith("The correct eventFee has to be paid");
            expect(await event.participantCount()).to.equal(BigInt("0"));

            // TODO: expand the function letOneParticipantJoinsTheEvent with the possibility to override the sending ether
            await expect(
                event.connect(user4).joinEvent(
                    "John",
                    "Smith",
                    "smith@reher.hostingkunde.de",
                    "+49 176 1231242341",
                    8,
                    {value: parseEther("0")},
                )
            ).to.be.revertedWith("The correct eventFee has to be paid");
            expect(await event.participantCount()).to.equal(BigInt("0"));

            // TODO: expand the function letOneParticipantJoinsTheEvent with the possibility to override the sending ether
            await expect(
                event.connect(user4).joinEvent(
                    "John",
                    "Smith",
                    "smith@reher.hostingkunde.de",
                    "+49 176 1231242341",
                    8,
                    {value: parseEther("9999")},
                )
            ).to.be.revertedWith("The correct eventFee has to be paid");
            expect(await event.participantCount()).to.equal(BigInt("0"));

            // TODO: expand the function letOneParticipantJoinsTheEvent with the possibility to override the sending ether
            await expect(
                event.connect(user4).joinEvent(
                    "John",
                    "Smith",
                    "smith@reher.hostingkunde.de",
                    "+49 176 1231242341",
                    8,
                    {value: parseEther("0.99999999999999999")},
                )
            ).to.be.revertedWith("The correct eventFee has to be paid");
            expect(await event.participantCount()).to.equal(BigInt("0"));
        });
    });

    describe('Distributing event tests',  () => {
        it('should revert with message: The minimum number of participants has not been reached', async function () {
            let {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);
            expect(await event.eventStatus()).to.equal(BigInt(0));
            // Let 3 participants take part in the event
            await letParticipantsJoinsTheEvent(event, 3);
            expect(await event.participantCount()).to.equal(BigInt("3"));

            await expect(
                event.distributeEvent()
            ).to.be.revertedWith("The minimum number of participants has not been reached");
        });

        it('should revert with message: Only the owner can call this function', async function () {
            let {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);

            // Let 4 participants take part in the event
            await letParticipantsJoinsTheEvent(event, 4);

            // Check if someone other than the owner can distribute an event
            await expect(
                event.connect(user1).distributeEvent()
            ).to.be.revertedWith("Only the owner can call this function")
        });

        it('should revert with message: Only active events can be distributed', async function () {
            let {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);

            // Let 4 participants take part in the event
            await letParticipantsJoinsTheEvent(event, 4);

            // Check that the event can only be distributed in the active state
            await event.connect(owner).setEventStatus(1);
            await expect(
                event.distributeEvent()
            ).to.be.revertedWith("Only active events can be distributed")

            await event.connect(owner).setEventStatus(2);
            await expect(
                event.distributeEvent()
            ).to.be.revertedWith("Only active events can be distributed")

            await event.connect(owner).setEventStatus(3);
            await expect(
                event.distributeEvent()
            ).to.be.revertedWith("Only active events can be distributed")
        });

        it('should revert with message: You can only distribute 24 hours before the event started - before eventClosingTime', async function () {
            let {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);

            // Let 4 participants take part in the event
            await letParticipantsJoinsTheEvent(event, 4);

            // Set back the event status to active
            await event.connect(owner).setEventStatus(0);

            // Check the distribution time frames
            await time.increaseTo((await event.getEventClosingTime()) - BigInt(50));
            await expect(
                event.distributeEvent()
            ).to.be.revertedWith("You can only distribute 24 hours before the event started")
        });

        it('should revert with message: You can only distribute 24 hours before the event started - at eventClosingTime', async function () {
            let {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);

            // Let 4 participants take part in the event
            await letParticipantsJoinsTheEvent(event, 6);

            // Distribute the event
            await time.increaseTo((await event.getEventClosingTime()));
            await event.distributeEvent();

            // TODO: write tests to check the roles
            // console.log("after showParticipants::: " + await event.showParticipants());
            expect(await event.eventStatus()).to.equal(BigInt(1));
        });

        it('should revert with message: You can only distribute 24 hours before the event started - at eventTime', async function () {
            let {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);

            // Let 4 participants take part in the event
            await letParticipantsJoinsTheEvent(event, 4);

            // It is not allow to distribute at the event time
            await time.increaseTo((await event.eventDate()));
            await expect(
                event.distributeEvent()
            ).to.be.revertedWith("You can only distribute 24 hours before the event started")
        });

    });

    describe('Reclaiming event tests', function () {
        it('should be checked that the reclaim expenses works', async function () {
            const {event, owner, user1, user2, user3, user4, user5} = await loadFixture(deployContractAndSetVariables);

            // Let 4 participants take part in the event
            await letParticipantsJoinsTheEvent(event, 4);

            // Distribute the event
            await time.increaseTo((await event.getEventClosingTime()));
            await event.distributeEvent();

            // Take a snapshot of the current state of the blockchain
            const snapshot = await takeSnapshot();

            /*////////////////////////////////////////////////////////////////////////////////////////////*/
            /*//                                                                                        //*/
            /*//                          Test the function **to** event time                           //*/
            /*//                                                                                        //*/
            /*////////////////////////////////////////////////////////////////////////////////////////////*/

            await time.increaseTo((await event.eventDate()));

            let [user1ExpensesDefault, user1ReclaimedDefault] = await event.connect(user1).getUserExpenses();
            expect(user1ExpensesDefault).to.equal(0);
            expect(user1ReclaimedDefault).to.be.false;

            // test to reclaim expenses
            await event.connect(owner).reclaimExpenses(parseEther("0.0034"));
            await event.connect(user1).reclaimExpenses(parseEther("0.0025"));
            await event.connect(user2).reclaimExpenses(parseEther("0.0019"));

            // Check if the correct amount is send to the contract
            let [user1Expenses, user1Reclaimed] = await event.connect(owner).getUserExpenses();
            expect(user1Expenses).to.equal(parseEther("0.0034"));
            expect(user1Reclaimed).to.be.true;
            let [user2Expenses, user2Reclaimed] = await event.connect(user1).getUserExpenses();
            expect(user2Expenses).to.equal(parseEther("0.0025"));
            expect(user2Reclaimed).to.be.true;

            expect(await event.connect(user2).getMyExpenses()).to.equal(parseEther("0.0019"));
            expect(await event.connect(user3).getMyExpenses()).to.equal(parseEther("0"));

            await snapshot.restore();

            /*////////////////////////////////////////////////////////////////////////////////////////////*/
            /*//                                                                                        //*/
            /*//               Test the function **before** event time - should not work                //*/
            /*//                                                                                        //*/
            /*////////////////////////////////////////////////////////////////////////////////////////////*/

            await time.increaseTo((await event.eventDate()) - BigInt(50));
            await expect(
                event.connect(user1).reclaimExpenses(parseEther("0.0019"))
            ).to.be.revertedWith("You can only enter your expenses after the event started and within the withdraw time");

            await snapshot.restore();

            /*////////////////////////////////////////////////////////////////////////////////////////////*/
            /*//                                                                                        //*/
            /*//           Test the function at the withdraw event time - should not work               //*/
            /*//                                                                                        //*/
            /*////////////////////////////////////////////////////////////////////////////////////////////*/

            await time.increaseTo((await event.eventDate()) + BigInt(WITHDRAW_TIME_FRAME));
            await expect(
                event.connect(user1).reclaimExpenses(parseEther("0.0019"))
            ).to.be.revertedWith("You can only enter your expenses after the event started and within the withdraw time");

            await snapshot.restore();

            /*////////////////////////////////////////////////////////////////////////////////////////////*/
            /*//                                                                                        //*/
            /*//                   Testing overwriting the amoung on the Expenses                       //*/
            /*//                                                                                        //*/
            /*////////////////////////////////////////////////////////////////////////////////////////////*/

            await time.increaseTo((await event.eventDate()));

            // Test to reclaim expenses
            await event.connect(owner).reclaimExpenses(parseEther("0.0034"));
            await event.connect(user1).reclaimExpenses(parseEther("0.0025"));
            await event.connect(user2).reclaimExpenses(parseEther("0.0019"));

            // Check if the correct amount is send to the contract
            expect(await event.connect(owner).getMyExpenses()).to.equal(parseEther("0.0034"));
            expect(await event.connect(user1).getMyExpenses()).to.equal(parseEther("0.0025"));
            expect(await event.connect(user2).getMyExpenses()).to.equal(parseEther("0.0019"));
            // check implicit set of expenses
            expect(await event.connect(user3).getMyExpenses()).to.equal(parseEther("0"));

            await event.connect(user3).reclaimExpenses(0);
            // check explicit set of expenses
            expect(await event.connect(user3).getMyExpenses()).to.equal(0);

            // calculation with constant -- 0.0040 * 1e18 - 0.001
            await event.connect(user3).reclaimExpenses(MAX_AMOUNT_TO_RECAIM - parseEther("0.001"));
            expect(await event.connect(user3).getMyExpenses()).to.equal(MAX_AMOUNT_TO_RECAIM - parseEther("0.001"));

            await expect(
                // calculation with constant -- 0.0040 * 1e18 + 0.001
                event.connect(user1).reclaimExpenses(MAX_AMOUNT_TO_RECAIM + parseEther("0.001"))
            ).to.be.revertedWith("It has to be more than 0 EUR and less than 0.0040 Ether");
            // The value was not overridden by the previous test
            expect(await event.connect(user1).getMyExpenses()).to.equal(parseEther("0.0025"));

            await snapshot.restore();

            await time.increaseTo((await event.eventDate()));

            // test to reclaim expenses
            await event.connect(owner).reclaimExpenses(parseEther("0.0036"));
            await event.connect(user1).reclaimExpenses(parseEther("0.0025"));
            await event.connect(user2).reclaimExpenses(parseEther("0.0019"));
            await event.connect(user3).reclaimExpenses(parseEther("0"));

            // console.log("getExpenses: ", await event.connect(user1).showExpenses());
        });
    });

    describe('Handling expenses event tests', function () {
    it('should be checked that the expenses entered correctly', async function () {
        const {event, owner, user1, user2, user3, user4, user5} = await loadFixture(deployContractAndSetVariables);

        // Let 4 participants take part in the event
        await letParticipantsJoinsTheEvent(event, 4);

        // Distribute the event
        await time.increaseTo((await event.getEventClosingTime()));
        await event.distributeEvent();

        expect(await event.eventStatus()).to.equal(BigInt(1));

        // take a snapshot of the current state of the blockchain
        const snapshot = await takeSnapshot();

        /*////////////////////////////////////////////////////////////////////////////////////////////*/
        /*//                                                                                        //*/
        /*//                    Test normal reclaimExpenses to the wrong time                       //*/
        /*//                                                                                        //*/
        /*////////////////////////////////////////////////////////////////////////////////////////////*/

        await time.increaseTo((await event.eventDate()) - BigInt(50));
        await expect(
            event.connect(user1).reclaimExpenses(parseEther("0.0034"))
        ).to.be.revertedWith("You can only enter your expenses after the event started and within the withdraw time");

        await time.increaseTo((await event.eventDate()) + BigInt(WITHDRAW_TIME_FRAME) + BigInt(50));
        await expect(
            event.connect(user1).reclaimExpenses(parseEther("0.0034"))
        ).to.be.revertedWith("You can only enter your expenses after the event started and within the withdraw time");

        await snapshot.restore();

        /*////////////////////////////////////////////////////////////////////////////////////////////*/
        /*//                                                                                        //*/
        /*//                       Test normal reclaimExpenses to event time                        //*/
        /*//                                                                                        //*/
        /*////////////////////////////////////////////////////////////////////////////////////////////*/

        await time.increaseTo((await event.eventDate()));

        // enter reclaim expenses
        await event.connect(owner).reclaimExpenses(parseEther("0.0034"));
        await event.connect(user1).reclaimExpenses(parseEther("0.0025"));
        await event.connect(user2).reclaimExpenses(parseEther("0.0019"));

        // // Check if the correct amount is send to the contract
        expect(await event.connect(owner).getMyExpenses()).to.equal(parseEther("0.0034"));
        expect(await event.connect(user1).getMyExpenses()).to.equal(parseEther("0.0025"));
        expect(await event.connect(user2).getMyExpenses()).to.equal(parseEther("0.0019"));
        expect(await event.connect(user3).getMyExpenses()).to.equal(parseEther("0"));

    });
    });

    describe('Handling event compensation tests', function () {
        it('should be checked that the event compensation (withdraw) is calculated correctly', async function () {
        const {event, owner, user1, user2, user3, user4, user5} = await loadFixture(deployContractAndSetVariables);

        // Let 3 participants take part in the event
        await letParticipantsJoinsTheEvent(event, 3);

        // take a snapshot of the current state of the blockchain
        const snapshot = await takeSnapshot();

        /*////////////////////////////////////////////////////////////////////////////////////////////*/
        /*//                                                                                        //*/
        /*//                      Test normal withdraw all participant joined                       //*/
        /*//                                                                                        //*/
        /*////////////////////////////////////////////////////////////////////////////////////////////*/

        await letOneParticipantJoinsTheEvent(event, MARC, user3);

        // Distribute the event
        await time.increaseTo((await event.getEventClosingTime()));
        await event.distributeEvent();

        await time.increaseTo((await event.eventDate()));
        await event.connect(owner).reclaimExpenses(parseEther("0"));
        await event.connect(user1).reclaimExpenses(parseEther("0.0015"));
        await event.connect(user2).reclaimExpenses(parseEther("0.0005"));
        await event.connect(user3).reclaimExpenses(parseEther("0"));

        await time.increaseTo((await event.eventDate() + BigInt(ENDED_TIME_FRAME) - BigInt(30)));

        await event.connect(user2).confirmParticipation(owner.address);
        await event.connect(user3).confirmParticipation(user1.address);
        await event.connect(owner).confirmParticipation(user2.address);
        await event.connect(user1).confirmParticipation(user3.address);

        await time.increaseTo((await event.eventDate() + BigInt(ENDED_TIME_FRAME) + BigInt(30)));

        // console.log("before 1. withdraw");

        // Check if the withdraw flag was set
        expect(await event.connect(owner).getWithDraw()).to.be.false;
        expect(await event.connect(user1).getWithDraw()).to.be.false;
        expect(await event.connect(user2).getWithDraw()).to.be.false;
        expect(await event.connect(user3).getWithDraw()).to.be.false;

        // 1. withdraw
        await event.connect(owner).withdraw();
        await event.connect(user1).withdraw();
        await event.connect(user2).withdraw();
        await event.connect(user3).withdraw();
        // console.log("getExpenses: ", await event.connect(user1).showExpenses());

        // Check if the correct event compensaton was calculated
        expect(await event.connect(owner).getMyEventCompensation()).to.equal(parseEther("0.0005"));
        expect(await event.connect(user1).getMyEventCompensation()).to.equal(parseEther("0.0020"));
        expect(await event.connect(user2).getMyEventCompensation()).to.equal(parseEther("0.0010"));
        expect(await event.connect(user3).getMyEventCompensation()).to.equal(parseEther("0.0005"));

        // Check if the withdraw flag was set
        expect(await event.connect(owner).getWithDraw()).to.be.true;
        expect(await event.connect(user1).getWithDraw()).to.be.true;
        expect(await event.connect(user2).getWithDraw()).to.be.true;
        expect(await event.connect(user3).getWithDraw()).to.be.true;

        // TODO: printOutBalances?
        // printOutBalances("after 1. withdraw");

        /*////////////////////////////////////////////////////////////////////////////////////////////*/
        /*//                                                                                        //*/
        /*//                   Test normal withdraw WITHOUT ONE participant joined                  //*/
        /*//                                                                                        //*/
        /*////////////////////////////////////////////////////////////////////////////////////////////*/

        await snapshot.restore();
        await letOneParticipantJoinsTheEvent(event, MARC, user3);
        await letOneParticipantJoinsTheEvent(event, ELENA, user4);

        // Distribute the event
        await time.increaseTo((await event.getEventClosingTime()));
        await event.distributeEvent();

        await time.increaseTo((await event.eventDate()));
        await event.connect(owner).reclaimExpenses(parseEther("0"));
        await event.connect(user1).reclaimExpenses(parseEther("0.0015"));
        await event.connect(user2).reclaimExpenses(parseEther("0.0005"));
        await event.connect(user3).reclaimExpenses(parseEther("0"));
        // User 4 will NOT reclaim

        await time.increaseTo((await event.eventDate() + BigInt(ENDED_TIME_FRAME) + BigInt(30)));

        await event.connect(user1).confirmParticipation(owner.address);
        await event.connect(user2).confirmParticipation(user1.address);
        await event.connect(user1).confirmParticipation(user2.address);
        await event.connect(owner).confirmParticipation(user3.address);
        // User 4 will NOT confirmed

        await time.increaseTo((await event.eventDate() + BigInt(WITHDRAW_TIME_FRAME) - BigInt(30)));

        // 2. withdraw
        await event.connect(owner).withdraw();
        await event.connect(user1).withdraw();
        await event.connect(user2).withdraw();
        await event.connect(user3).withdraw();
        // User 4 will NOT withdraw

        // console.log("getExpenses: ", await event.connect(user1).showExpenses());

        // Check if the correct event compensaton was calculated
        expect(await event.connect(owner).getMyEventCompensation()).to.equal(parseEther("0.00075"));
        expect(await event.connect(user1).getMyEventCompensation()).to.equal(parseEther("0.00225"));
        expect(await event.connect(user2).getMyEventCompensation()).to.equal(parseEther("0.00125"));
        expect(await event.connect(user3).getMyEventCompensation()).to.equal(parseEther("0.00075"));
        expect(await event.connect(user4).getMyEventCompensation()).to.equal(parseEther("0"));

        await snapshot.restore();

        /*////////////////////////////////////////////////////////////////////////////////////////////*/
        /*//                                                                                        //*/
        /*//                   Test normal withdraw WITHOUT TWO participant joined                  //*/
        /*//                                                                                        //*/
        /*////////////////////////////////////////////////////////////////////////////////////////////*/

        await letOneParticipantJoinsTheEvent(event, MARC, user3);
        await letOneParticipantJoinsTheEvent(event, ELENA, user4);

        // Check if the withdraw function only works in the right event status
        await expect(
            event.connect(user2).withdraw()
        ).to.be.revertedWith("Expenses can only be entered for distributed or ended events");

        // Distribute the event
        await time.increaseTo((await event.getEventClosingTime()));
        await event.distributeEvent();

        // Check if the withdraw function only works in the right event time frame
        await expect(
            event.connect(user2).withdraw()
        ).to.be.revertedWith("You can only withdraw your ether when the event has ended and within the withdraw time frame");

        await time.increaseTo((await event.eventDate()));

        // Check if the withdraw function only works in the right event time frame
        await expect(
            event.connect(user2).withdraw()
        ).to.be.revertedWith("You can only withdraw your ether when the event has ended and within the withdraw time frame");

        await event.connect(owner).reclaimExpenses(parseEther("0"));
        await event.connect(user1).reclaimExpenses(parseEther("0.0015"));
        await event.connect(user2).reclaimExpenses(parseEther("0.0005"));
        await event.connect(user3).reclaimExpenses(parseEther("0"));
        // User 4 will NOT reclaim

        await time.increaseTo((await event.eventDate() + BigInt(ENDED_TIME_FRAME) - BigInt(30)));

        // Check if the withdraw function only works in the right event time frame
        await expect(
            event.connect(user2).withdraw()
        ).to.be.revertedWith("You can only withdraw your ether when the event has ended and within the withdraw time frame");

        await time.increaseTo((await event.eventDate() + BigInt(ENDED_TIME_FRAME) + BigInt(30)));

        // Check if the withdraw function only works in the right event time frame
        await expect(
            event.connect(user2).withdraw()
        ).to.be.revertedWith("There are no confirmed participants in the event");

        await event.connect(user1).confirmParticipation(owner.address);
        await event.connect(user2).confirmParticipation(user1.address);
        await event.connect(user1).confirmParticipation(user2.address);
        // User 4 will NOT confirmed
        // User 5 will NOT confirmed

        await time.increaseTo((await event.eventDate() + BigInt(WITHDRAW_TIME_FRAME) - BigInt(30)));

        // 3. withdraw
        // console.log("3. withdraw");
        await event.connect(owner).withdraw();
        await event.connect(user1).withdraw();
        await event.connect(user2).withdraw();
        await event.connect(user3).withdraw();
        // User 4 will NOT withdraw

        // Check if the correct event compensaton was calculated
        expect(await event.connect(owner).getMyEventCompensation()).to.equal(parseEther("0.0010"));
        expect(await event.connect(user1).getMyEventCompensation()).to.equal(parseEther("0.0025"));
        expect(await event.connect(user2).getMyEventCompensation()).to.equal(parseEther("0.0015"));
        expect(await event.connect(user3).getMyEventCompensation()).to.equal(parseEther("0"));
        expect(await event.connect(user4).getMyEventCompensation()).to.equal(parseEther("0"));


        /*////////////////////////////////////////////////////////////////////////////////////////////*/
        /*//                                                                                        //*/
        /*//                      Test EventStatus Ended AFTER withdraw call                        //*/
        /*//                                                                                        //*/
        /*////////////////////////////////////////////////////////////////////////////////////////////*/

        await snapshot.restore();
        await letOneParticipantJoinsTheEvent(event, MARC, user3);

        // Distribute the event
        await time.increaseTo((await event.getEventClosingTime()));
        await event.distributeEvent();

        // Reclaim Expenses
        await time.increaseTo((await event.eventDate()));

        await event.connect(owner).reclaimExpenses(parseEther("0"));
        await event.connect(user1).reclaimExpenses(parseEther("0.0015"));
        await event.connect(user2).reclaimExpenses(parseEther("0.0005"));
        await event.connect(user3).reclaimExpenses(parseEther("0"));

        await event.connect(user1).confirmParticipation(owner.address);
        await event.connect(user2).confirmParticipation(user1.address);
        await event.connect(user1).confirmParticipation(user2.address);
        await event.connect(owner).confirmParticipation(user3.address);

        // Check Ended Event Status
        await time.increaseTo((await event.eventDate() + BigInt(ENDED_TIME_FRAME) + BigInt(30)));
        // Check Distributed Event Status
        expect(await event.eventStatus()).to.equal(BigInt(1));

        // 4. withdraw
        // console.log("4. withdraw");
        await event.connect(owner).withdraw();
        await event.connect(user1).withdraw();
        await event.connect(user2).withdraw();
        await event.connect(user3).withdraw();

        // Check Ended Event Status
        expect(await event.eventStatus()).to.equal(BigInt(2));

        // TODO: check function checkExpensesAndConfirmation
        // TODO: check function calcEventCompensation

        // Backup
        //
        // // test the enter expenses
        // await event.connect(user1).payExpenses({
        //     value: parseEther("0.0034")
        // });
        //
        // await event.connect(user2).payExpenses({
        //     value: parseEther("0.0025")
        // });
        //
        // await event.connect(user3).payExpenses({
        //     value: parseEther("0.0019")
        // });
        //
        // // Check if the balance reduce for the users

        // TODO: printOutBalances?
        // printOutBalances("after 1. withdraw");

        // console.log("getExpenses: ", await event.connect(user1).showExpenses());

        });
    });

    describe('Handling event comfirmation tests', function () {
        it('should be checked that the participation is correctly confirmed', async function () {
            const {event, owner, user1, user2, user3, user4, user5} = await loadFixture(deployContractAndSetVariables);

            await letParticipantsJoinsTheEvent(event, 4);

            // Check before event time and distribution
            await expect(
                event.connect(user3).confirmParticipation(user2.address)
            ).to.be.revertedWith("This event has to be distributed or ended");

            // Distribute the event
            await time.increaseTo((await event.getEventClosingTime()));
            await event.distributeEvent();

            // Check before event time
            await expect(
                event.connect(user3).confirmParticipation(user2.address)
            ).to.be.revertedWith("You can only confirm others after the event started and within the withdraw time");

            await time.increaseTo((await event.eventDate()));

            // You can't confirm yourself
            await expect(
                event.connect(user2).confirmParticipation(user2.address)
            ).to.be.revertedWith("Another user has to confirm you!");

            // Only participants can confirm users, who joined the event
            await expect(
                event.connect(user4).confirmParticipation(user2.address)
            ).to.be.revertedWith("Only participants can use this function");

            await expect(
                event.connect(user2).confirmParticipation(user4.address)
            ).to.be.revertedWith("There is no value for this address");

            // take a snapshot of the current state of the blockchain
            const snapshot = await takeSnapshot();

            // test the confirm Participation function
            expect(await event.connect(owner).isConfirmed()).to.false;
            expect(await event.connect(user1).isConfirmed()).to.false;
            expect(await event.connect(user2).isConfirmed()).to.false;

            await event.connect(user1).confirmParticipation(owner.address);
            await event.connect(user2).confirmParticipation(user1.address);
            await event.connect(user1).confirmParticipation(user2.address);

            expect(await event.connect(owner).isConfirmed()).to.true;
            expect(await event.connect(user1).isConfirmed()).to.true;
            expect(await event.connect(user2).isConfirmed()).to.true;

            // console.log("getExpenses: ", await event.connect(user1).showExpenses());
        });

        it('should be checked that the event status works correctly with the participation confirmation', async function () {
            const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);

            await letParticipantsJoinsTheEvent(event, 3);

            // Check Active status
            await expect(
                event.connect(user2).confirmParticipation(user1.address)
            ).to.be.revertedWith("This event has to be distributed or ended");

            // Check Distributed status
            // TODO: replace numbers with constants
            event.connect(owner).setEventStatus(1);
            await time.increaseTo((await event.eventDate()));
            await expect(
                event.connect(user2).confirmParticipation(user2.address)
            ).to.be.revertedWith("Another user has to confirm you!");


            expect(await event.connect(owner).isConfirmed()).to.false;
            expect(await event.connect(user1).isConfirmed()).to.false;
            expect(await event.connect(user2).isConfirmed()).to.false;

            await event.connect(user2).confirmParticipation(user1.address);
            expect(await event.connect(user1).isConfirmed()).to.true;
            await event.connect(user1).confirmParticipation(user2.address);
            expect(await event.connect(user2).isConfirmed()).to.true;
            await event.connect(user1).confirmParticipation(owner.address);
            expect(await event.connect(owner).isConfirmed()).to.true;

            // Check Ended status
            event.connect(owner).setEventStatus(2);
            await event.connect(user2).confirmParticipation(owner.address);

            // Check Cancel status
            event.connect(owner).setEventStatus(3);
            await expect(
                event.connect(user2).confirmParticipation(owner.address)
            ).to.be.revertedWith("This event has to be distributed or ended");

            // TODO: Check the withdraw time
            // console.log("getExpenses: ", await event.getExpenses());
        });
    });

    describe("Handling event canelation tests", function () {
        it('should be tested that the event cancelation works', async function () {
            const {event, owner, user1, user2, user3, user4, user5} = await loadFixture(deployContractAndSetVariables);

            await expect(event.connect(user1).cancelEvent()).to.be.revertedWith("Only the owner can call this function");
            await expect(event.connect(user2).cancelEvent()).to.be.revertedWith("Only the owner can call this function");

            await letParticipantsJoinsTheEvent(event, 5);

            await event.cancelEvent();
            // Check that no participants are in the event
            expect(await event.participantCount()).to.equal(BigInt("0"));
            // Check the Cancel Status
            expect(await event.eventStatus()).to.equal("3");
        });

        it('should be tested that the cancelation of a participant works', async function () {
            const {event, owner, user1, user2, user3, user4, user5} = await loadFixture(deployContractAndSetVariables);

            expect(await event.participantCount()).to.equal(BigInt("0"));
            await letOneParticipantJoinsTheEvent(event, MARION, user1);
            expect(await event.participantCount()).to.equal(BigInt("1"));

            // Cancel from a user who hasn't joined the event
            await expect(event.connect(user2).cancelParticipant()).to.be.revertedWith("Only participants can use this function");
            await expect(event.connect(user3).cancelParticipant()).to.be.revertedWith("Only participants can use this function");

            await event.connect(user1).cancelParticipant();
            // await expect(await event.connect(user1).cancelEvent()).to.be.equal(true);
            // console.log("getParticipants 2: ", await event.getParticipants());
            await expect(await event.participantCount()).to.equal(BigInt("0"));

            // The owner can not cancel the event
            await expect(event.connect(owner).cancelParticipant()).to.be.revertedWith("As an owner you can't call this function");
        });
    });

    //
    // it('is not clear, difference walletUser1 and user1', async function () {
    //     const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);
    //
    //     // Local testnet
    //     const url = process.env.TESTNET_RPC_URL_LOCAL;
    //     const provider = new JsonRpcProvider(url);
    //     let walletUser0 = new Wallet(process.env.TESTNET_PRIVATE_KEY_USER0, provider);
    //     let walletUser1 = new Wallet(process.env.TESTNET_PRIVATE_KEY_USER1, provider);
    //     let walletUser2 = new Wallet(process.env.TESTNET_PRIVATE_KEY_USER2, provider);
    //     let walletUser3 = new Wallet(process.env.TESTNET_PRIVATE_KEY_USER3, provider);
    //     let walletUser4 = new Wallet(process.env.TESTNET_PRIVATE_KEY_USER4, provider);
    //
    //     // console.log("user1: ", user1);
    //     // console.log("walletUser1: ", walletUser1);
    // });

    // it('test msg.sender', async function () {
    //     const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);
    //     await event.getMsgSender();
    //     expect(await event.testSender()).to.equal(owner.address);
    //     await event.connect(user2).getMsgSender();
    //     expect(await event.testSender()).to.equal(user2.address);
    //     await event.connect(user3).getMsgSender();
    //     expect(await event.testSender()).to.equal(user3.address);
    // });

    // it('test join Event Static', async function () {
    //     const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);
    //
    //     await event.joinEventStatic();
    //     expect(await event.participantCount()).to.equal(BigInt("1"));
    //     const getParticipants = await event.getParticipants();
    //     console.log("getParticipants: ", getParticipants);
    //
    //     expect(getParticipants[0].firstname).to.equal("_firstname");
    //     expect(getParticipants[0].lastname).to.equal("_lastname");
    //     expect(getParticipants[0].email).to.equal("_email");
    //     expect(getParticipants[0].telephone).to.equal("_telephone");
    //     expect(getParticipants[0].event_fee).to.equal("1000000000000000000");
    //     expect(getParticipants[0].seats).to.equal(BigInt("6"));
    //
    //     const participantCount = await event.participantCount();
    //     expect(participantCount).to.equal(1);
    //     console.log("participantCount: ", participantCount);
    //
    //     const balances = await event.balanceOf(owner.address);
    //     console.log("balances: ", balances);
    // });

    // it('should not allow withdrawals above .1 ETH at a time', async function () {
    //   const { faucet, withdrawAmount } = await loadFixture(
    //       deployContractAndSetVariables
    //   );
    //   await expect(faucet.withdraw(withdrawAmount)).to.be.reverted;
    // });
    //
    // it('addr1 - only be called by the contract owner, as should the withdrawAll function', async function () {
    //   const { faucet, owner, addr1 } = await loadFixture(
    //       deployContractAndSetVariables
    //   );
    //   await expect(faucet.connect(addr1).withdrawAll()).to.be.reverted;
    // });
    // it('addr1 - only be called by the contract owner, as should the destroyFaucet function', async function () {
    //   const { faucet, owner, addr1 } = await loadFixture(
    //       deployContractAndSetVariables
    //   );
    //   await expect(faucet.connect(addr1).destroyFaucet()).to.be.reverted;
    // });
    // it('addr2 - only be called by the contract owner, as should the withdrawAll function', async function () {
    //   const { faucet, owner, addr2 } = await loadFixture(
    //       deployContractAndSetVariables
    //   );
    //   await expect(faucet.connect(addr2).withdrawAll()).to.be.reverted;
    // });
    // it('owner call the withdrawAll function', async function () {
    //   const { faucet, owner, addr2 } = await loadFixture(
    //       deployContractAndSetVariables
    //   );
    //   await expect(faucet.connect(owner).withdrawAll()).not.to.be.reverted;
    // });
    // it('owner call the destroyFaucet function', async function () {
    //   const { faucet, owner, addr2 } = await loadFixture(
    //       deployContractAndSetVariables
    //   );
    //   await expect(faucet.connect(owner).destroyFaucet()).not.to.be.reverted;
    // });
    // it('addr1 call the destroyFaucet function', async function () {
    //   const { faucet, owner, addr2 } = await loadFixture(
    //       deployContractAndSetVariables
    //   );
    //   await expect(faucet.connect(addr2).destroyFaucet()).to.be.reverted;
    // });

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

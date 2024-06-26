const {loadFixture, takeSnapshot} = require('@nomicfoundation/hardhat-network-helpers');
const {time} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {expect} = require('chai');
const {JsonRpcProvider, Wallet, parseEther, formatUnits} = require("ethers");

const MIN_PARTICIPANTS = 4;
const HOUR_IN_SECONDS = 3600;
const DAY_IN_SECONDS = 86400;
const EVENT_DEPOSIT = parseEther("0.0010");
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

describe('Functional event tests', function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployContractAndSetVariables() {
        const Event = await ethers.getContractFactory('Event');

        const event = await Event.deploy(
            "First Cooking Event",
            "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed.",
            (await time.latest()) + (14 * DAY_IN_SECONDS),
            EVENT_DEPOSIT
        );

        // Next Event
        const event2 = await Event.deploy(
            "Second Cooking Event",
            "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed.",
            (await time.latest()) + (5 * DAY_IN_SECONDS),
            EVENT_DEPOSIT
        );

        const [owner, user1, user2, user3, user4, user5] = await ethers.getSigners();
        return {event, event2, owner, user1, user2, user3, user4, user5};
    }


    describe('Basic event tests', function () {
        it('should deploy and set the owner correctly', async function () {
            const {event, owner} = await loadFixture(deployContractAndSetVariables);

            expect(await event.owner()).to.equal(owner.address);
        });

        it('should be tested that the title and the description exists and be correct', async function () {
            const {event} = await loadFixture(deployContractAndSetVariables);

            expect(await event.title()).to.equal("First Cooking Event");
            expect(await event.description()).to.equal("Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed.");

            // Checking the Event Status
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
            ).to.be.revertedWithCustomError(
                event,
                "UserHasAlreadyJoinedTheEvent"
            );
            await letOneParticipantJoinsTheEvent(event, MARION, user2);
        });

        it('should be tested that event status changes correctly', async function () {
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
                    {value: EVENT_DEPOSIT}
                )
            ).to.be.revertedWith("The minimum seats are four");

            await letOneParticipantJoinsTheEvent(event, MARTIN, user4);
            expect(await event.eventSeats()).to.equal(BigInt(4));
        });

        it('should prevent to enter the event without the incorrect event deposit', async function () {
            const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);

            // TODO: expand the function letOneParticipantJoinsTheEvent with the possibility to override the sending ether
            await expect(
                event.connect(user4).joinEvent(
                    "John",
                    "Smith",
                    "smith@reher.hostingkunde.de",
                    "+49 176 1231242341",
                    8,
                    {value: EVENT_DEPOSIT + parseEther("0.0020")},
                )
            ).to.be.revertedWith("The correct eventDeposit has to be paid");
            expect(await event.participantCount()).to.equal(BigInt("0"));

            // TODO: expand the function letOneParticipantJoinsTheEvent with the possibility to override the sending ether
            await expect(
                event.connect(user4).joinEvent(
                    "John",
                    "Smith",
                    "smith@reher.hostingkunde.de",
                    "+49 176 1231242341",
                    8,
                    {value: EVENT_DEPOSIT - parseEther("0.00055")},
                )
            ).to.be.revertedWith("The correct eventDeposit has to be paid");
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
            ).to.be.revertedWith("The correct eventDeposit has to be paid");
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
            ).to.be.revertedWith("The correct eventDeposit has to be paid");
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
            ).to.be.revertedWith("The correct eventDeposit has to be paid");
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
        // TODO: write test to check if the distribution of roles works correctly and that the first user remains the host. It should not shuttled
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

            /*////////////////////////////////////////////////////////////////////////////////////////////*/
            /*//                                                                                        //*/
            /*//                      Test EventStatus withdraw only once                               //*/
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

            // Check if the withdraw function only works only once
            await expect(
                event.connect(user2).withdraw()
            ).to.be.revertedWith("The deposit can only once withdraw");

            // Check Ended Event Status
            expect(await event.eventStatus()).to.equal(BigInt(2));

            // TODO: check function calcEventCompensation
            // printOutBalances("after 1. withdraw");
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

            // The user can't confirm itself
            await expect(
                event.connect(user2).confirmParticipation(user2.address)
            ).to.be.revertedWith("Another user has to confirm you!");

            // Only participants can confirm users, who have joined the event
            await expect(
                event.connect(user4).confirmParticipation(user2.address)
            ).to.be.revertedWith("Only participants can use this function");

            // Participants can only confirm users, who have joined the event
            await expect(
                event.connect(user2).confirmParticipation(user4.address)
            ).to.be.revertedWithCustomError(
                event,
                "NoRegistrationFoundForThisUser"
            );

            // take a snapshot of the current state of the blockchain
            const snapshot = await takeSnapshot();

            // Test the default confirm participation function
            expect(await event.connect(owner).isConfirmed()).to.false;
            expect(await event.connect(user1).isConfirmed()).to.false;
            expect(await event.connect(user2).isConfirmed()).to.false;

            // Confirm the participations among each other
            await event.connect(user1).confirmParticipation(owner.address);
            await event.connect(user2).confirmParticipation(user1.address);
            await event.connect(user1).confirmParticipation(user2.address);

            // Test the confirm participation function works
            expect(await event.connect(owner).isConfirmed()).to.true;
            expect(await event.connect(user1).isConfirmed()).to.true;
            expect(await event.connect(user2).isConfirmed()).to.true;
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

            // Test the default confirm participation function
            expect(await event.connect(owner).isConfirmed()).to.false;
            expect(await event.connect(user1).isConfirmed()).to.false;
            expect(await event.connect(user2).isConfirmed()).to.false;

            // Confirm the participations among each other
            await event.connect(user2).confirmParticipation(user1.address);
            await event.connect(user1).confirmParticipation(user2.address);
            await event.connect(user1).confirmParticipation(owner.address);

            // Test the confirm participation function works
            expect(await event.connect(user1).isConfirmed()).to.true;
            expect(await event.connect(user2).isConfirmed()).to.true;
            expect(await event.connect(owner).isConfirmed()).to.true;

            // Check Ended status
            event.connect(owner).setEventStatus(2);
            await event.connect(user2).confirmParticipation(owner.address);

            // Check Cancel status
            event.connect(owner).setEventStatus(3);
            await expect(
                event.connect(user2).confirmParticipation(owner.address)
            ).to.be.revertedWith("This event has to be distributed or ended");
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
            {value: EVENT_DEPOSIT}
        );
    }
});

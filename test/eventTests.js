const {loadFixture, takeSnapshot} = require('@nomicfoundation/hardhat-network-helpers');
const {time} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {expect} = require('chai');
const {JsonRpcProvider, Wallet, parseEther, formatUnits} = require("ethers");

const HOUR_IN_SECONDS = 3600;
const DAY_IN_SECONDS = 86400;
const EVENT_FEE = parseEther("0.0010");
const WITHDRAW_TIME_FRAME = 48 * HOUR_IN_SECONDS;
const MIN_PARTICIPANTS = 4;
const CLOSING_TIME_FRAME = 24 * HOUR_IN_SECONDS;
const MAX_AMOUNT_TO_RECAIM = BigInt(0.0040 * 1e18);


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

        console.log('Signer 1 address: ', owner.address);
        console.log('Event contract address: ', await event.getAddress());
        console.log('Event contract address: ', await event2.getAddress());
        return {event, event2, owner, user1, user2, user3, user4, user5};
    }

    it('should deploy and set the owner correctly', async function () {
        const {event, owner} = await loadFixture(deployContractAndSetVariables);

        expect(await event.owner()).to.equal(owner.address);
    });

    it('the title and the description should be exists and be correct', async function () {
        const {event, owner} = await loadFixture(deployContractAndSetVariables);

        expect(await event.title()).to.equal("First Cooking Event");
        expect(await event.description()).to.equal("Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed.");

        // Checking the Event Status
        // TODO: How can we reuse the enum from the contract?
        const active = BigInt("0"); // Active
        let eventStatusFromContract = await event.eventStatus();
        expect(eventStatusFromContract).to.equal(active);
    });

    it('should be tested, that a user can only entered once', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);

        await event.connect(user2).joinEvent(
            "Maria",
            "Schuster",
            "schuster@reher.hostingkunde.de",
            "+49 176 2231242342",
            8,
            {value: EVENT_FEE}
        );

        await expect(
            event.connect(user2).joinEvent(
                "Marion",
                "Hamster",
                "hamster@reher.hostingkunde.de",
                "+49 176 5673124234",
                8,
                {value: EVENT_FEE}
            )
        ).to.be.revertedWith("the user have already joined the event");

        event.connect(user3).joinEvent(
            "Marion",
            "Hamster",
            "hamster@reher.hostingkunde.de",
            "+49 176 5673124234",
            8,
            {value: EVENT_FEE}
        )
    });

    it('event status changes', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);

        expect(await event.eventStatus()).to.equal("0");
        await event.setEventStatus(3);
        expect(await event.eventStatus()).to.equal("3");
        await expect(event.connect(user2).setEventStatus(4)).to.be.reverted;
        //await expect(event.connect(user2).setEventStatus(4)).to.be.revertedWith("Only the owner can call this function");
        expect(await event.eventStatus()).to.equal("3");
        // TODO: Find a way to test values out of bound of the enum
        // await expect(event.connect(user2).setEventStatus(8)).to.be.reverted;
        // expect(await event.eventStatus()).to.equal("3");
        // await expect(event.connect(user2).setEventStatus(-1)).to.be.reverted;
        // expect(await event.eventStatus()).to.equal("3");

        await expect(
            event.connect(user2).joinEvent(
                "Marion",
                "Hamster",
                "hamster@reher.hostingkunde.de",
                "+49 176 5673124234",
                8,
                {value: EVENT_FEE}
            )
        ).to.be.revertedWith("this event isn't active anymore");
    });

    it('event closed', async function () {
        const {event2, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);
        
        let timeNow = await time.latest();
        // console.log("Time start: " + timeNow);
        // console.log("Event Block Time: ", await event2.getBlockTime());
        // console.log("Event Closing Time: ", await event2.getEventClosingTime());

        // console.log("Time start: " + await time.latest());
        await event2.connect(user2).joinEvent(
            "Marion",
            "Hamster",
            "hamster@reher.hostingkunde.de",
            "+49 176 5673124234",
            8,
            {value: EVENT_FEE}
        );

        await time.increaseTo((await event2.getEventClosingTime()));

        // console.log("Event Block Time after: ", await event2.getBlockTime());
        // console.log("Event Closing Time after: ", await event2.getEventClosingTime());
        // console.log("Event Closing Time after: ", await event2.getBlockTime() < await event2.getEventClosingTime());
        await expect(
            event2.connect(user3).joinEvent(
                "Marion",
                "Hamster",
                "hamster@reher.hostingkunde.de",
                "+49 176 5673124234",
                8,
                {value: EVENT_FEE}
            )
        ).to.be.revertedWith("this event is closed");

        // console.log("Time end: " + await time.latest());

        // const getParticipants = await event2.getParticipants();
        // console.log("getParticipants: ", getParticipants);
    });

    it('participants joining the event', async function () {
        const {event, owner, user1, user2, user3, user4, user5} = await loadFixture(deployContractAndSetVariables);
        

        // const tx = await user2.connect(provider).sendTransaction({
        //   to: event.getAddress(),
        //   value: parseEther("0.8"),
        // });
        // console.log(tx);

        await event.connect(user1).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        );

        // expect(await event.testValue()).to.equal(parseEther("1.0"));
        // expect(await event.testSender()).to.equal(user4.address);

        expect(await event.participantCount()).to.equal(BigInt("1"));
        //const userBalance1 = await event.balanceOf(user1.address);
        //expect(userBalance1).to.equal(parseEther("1.0"));

        await event.connect(user2).joinEvent(
            "Maria",
            "Schuster",
            "schuster@reher.hostingkunde.de",
            "+49 176 2231242342",
            8,
            {value: EVENT_FEE}
        );

        expect(await event.participantCount()).to.equal(BigInt("2"));
        // const userBalance2 = await event.balanceOf(user2.address);
        // expect(userBalance2).to.equal(parseEther("1.0"));

        await event.connect(user3).joinEvent(
            "Mario",
            "Feldhalter",
            "feldhalter@reher.hostingkunde.de",
            "+49 176 3231242343",
            0,
            {value: EVENT_FEE}
        );

        expect(await event.participantCount()).to.equal(BigInt("3"));
        // const userBalance3 = await event.balanceOf(user3.address);
        // expect(userBalance3).to.equal(parseEther("1.0"));

        // const getParticipants = await event.getParticipants();
        // console.log("getParticipants: ", getParticipants);

        const getExpenses = await event.getExpenses();
        // console.log("getExpenses: ", getExpenses);
    });

    it('checks the event seats', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);
        

        await event.connect(user3).joinEvent(
            "Mario",
            "Feldhalter",
            "feldhalter@reher.hostingkunde.de",
            "+49 176 3231242343",
            2,
            {value: EVENT_FEE}
        );

        expect(await event.getEventSeats()).to.equal(BigInt(2));

        await event.connect(user2).joinEvent(
            "Maria",
            "Schuster",
            "schuster@reher.hostingkunde.de",
            "+49 176 2231242342",
            8,
            {value: EVENT_FEE}
        );

        await expect(
            event.connect(user4).joinEvent(
                "John",
                "Smith",
                "smith@reher.hostingkunde.de",
                "+49 176 1231242341",
                8,
                {value: EVENT_FEE}
            )
        ).to.be.revertedWith("there are no more seats");

        await expect(
            event.connect(user1).joinEvent(
                "John",
                "Smith",
                "smith@reher.hostingkunde.de",
                "+49 176 1231242341",
                8,
                {value: EVENT_FEE}
            )
        ).to.be.revertedWith("there are no more seats");
    });

    it('should be checked that the minimum event seats is right', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);
        

        await expect(
            event.connect(user1).joinEvent(
                "Mario",
                "Feldhalter",
                "feldhalter@reher.hostingkunde.de",
                "+49 176 3231242343",
                1,
                {value: EVENT_FEE}
            )
        ).to.be.revertedWith("The minimum seats are four");

        await event.connect(user4).joinEvent(
            "Mario",
            "Feldhalter",
            "feldhalter@reher.hostingkunde.de",
            "+49 176 3231242343",
            5,
            {value: EVENT_FEE}
        )

        expect(await event.getEventSeats()).to.equal(BigInt(5));
    });

    it('should prevent to enter the event without the incorrect event fee', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);

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

    it('should be verify that the participant count counts correct', async function () {
        const {event, owner} = await loadFixture(deployContractAndSetVariables);

        // console.log("Count: ", await event.participantCount());
        expect(await event.participantCount()).to.equal(BigInt("0"));
    });

    it('should be tested that the event distribution works', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);

        expect(await event.getEventStatus()).to.equal(BigInt(0));
        await event.connect(user1).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        );

        await event.connect(user2).joinEvent(
            "Maria",
            "Schuster",
            "schuster@reher.hostingkunde.de",
            "+49 176 2231242342",
            8,
            {value: EVENT_FEE}
        );

        await event.connect(user3).joinEvent(
            "Mario",
            "Feldhalter",
            "feldhalter@reher.hostingkunde.de",
            "+49 176 3231242343",
            2,
            {value: EVENT_FEE}
        );

        await expect(
            event.distributeEvent()
        ).to.be.revertedWith("The minimum number of participants has not been reached")

        await event.connect(user4).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        );

        // Check if someone other than the owner can distribute an event
        await expect(
            event.connect(user1).distributeEvent()
        ).to.be.revertedWith("Only the owner can call this function")

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

        // Set back the event status to active
        await event.connect(owner).setEventStatus(0);

        // take a snapshot of the current state of the blockchain
        const snapshot = await takeSnapshot();

        // Check the distribution time frames
        // It is not allow to distribute after the event started
        // console.log("Closing Time: ", (await event.getEventClosingTime()));
        // console.log("Event Time: ", (await event.getEventTime()));
        // console.log("Time: ", (await time.latest()));

        await time.increaseTo((await event.getEventClosingTime()) - BigInt(50));
        await expect(
            event.distributeEvent()
        ).to.be.revertedWith("You can only distribute 24 hours before the event started")

        await snapshot.restore();

        // TODO: Why a revert to the event time?
        // It is not allow to distribute before the event closing time
        await time.increaseTo((await event.getEventTime()));
        await expect(
            event.distributeEvent()
        ).to.be.revertedWith("You can only distribute 24 hours before the event started")

        await snapshot.restore();

        // Distribute the event
        await time.increaseTo((await event.getEventClosingTime()));
        await event.distributeEvent();

        expect(await event.getEventStatus()).to.equal(BigInt(1));
    });

    it('should be checked that the reclaim expenses works', async function () {
        const {event, owner, user1, user2, user3, user4, user5} = await loadFixture(deployContractAndSetVariables);
        
        await event.connect(user1).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        );

        await event.connect(user2).joinEvent(
            "Maria",
            "Schuster",
            "schuster@reher.hostingkunde.de",
            "+49 176 2231242342",
            8,
            {value: EVENT_FEE}
        );

        await event.connect(user3).joinEvent(
            "Mario",
            "Feldhalter",
            "feldhalter@reher.hostingkunde.de",
            "+49 176 3231242343",
            2,
            {value: EVENT_FEE}
        );

        await event.connect(user4).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        );

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

        await time.increaseTo((await event.getEventTime()));

        let [user1ExpensesDefault, user1ReclaimedDefault] = await event.connect(user1).getUserExpenses();
        expect(user1ExpensesDefault).to.equal(0);
        expect(user1ReclaimedDefault).to.be.false;

        // test to reclaim expenses
        await event.connect(user1).reclaimExpenses(parseEther("0.0034"));
        await event.connect(user2).reclaimExpenses(parseEther("0.0025"));
        await event.connect(user3).reclaimExpenses(parseEther("0.0019"));

        // Check if the correct amount is send to the contract
        let [user1Expenses, user1Reclaimed] = await event.connect(user1).getUserExpenses();
        expect(user1Expenses).to.equal(parseEther("0.0034"));
        expect(user1Reclaimed).to.be.true;
        let [user2Expenses, user2Reclaimed] = await event.connect(user2).getUserExpenses();
        expect(user2Expenses).to.equal(parseEther("0.0025"));
        expect(user2Reclaimed).to.be.true;

        expect(await event.connect(user3).getMyExpenses()).to.equal(parseEther("0.0019"));
        expect(await event.connect(user4).getMyExpenses()).to.equal(parseEther("0"));

        await snapshot.restore();

        /*////////////////////////////////////////////////////////////////////////////////////////////*/
        /*//                                                                                        //*/
        /*//               Test the function **before** event time - should not work                //*/
        /*//                                                                                        //*/
        /*////////////////////////////////////////////////////////////////////////////////////////////*/

        await time.increaseTo((await event.getEventTime()) - BigInt(50));
        await expect(
            event.connect(user1).reclaimExpenses(parseEther("0.0019"))
        ).to.be.revertedWith("You can only enter your expenses after the event started and within the withdraw time");

        await snapshot.restore();

        /*////////////////////////////////////////////////////////////////////////////////////////////*/
        /*//                                                                                        //*/
        /*//           Test the function at the withdraw event time - should not work               //*/
        /*//                                                                                        //*/
        /*////////////////////////////////////////////////////////////////////////////////////////////*/

        await time.increaseTo((await event.getEventTime()) + BigInt(WITHDRAW_TIME_FRAME));
        await expect(
            event.connect(user1).reclaimExpenses(parseEther("0.0019"))
        ).to.be.revertedWith("You can only enter your expenses after the event started and within the withdraw time");

        await snapshot.restore();

        /*////////////////////////////////////////////////////////////////////////////////////////////*/
        /*//                                                                                        //*/
        /*//                   Testing overwriting the amoung on the Expenses                       //*/
        /*//                                                                                        //*/
        /*////////////////////////////////////////////////////////////////////////////////////////////*/

        await time.increaseTo((await event.getEventTime()));

        // Test to reclaim expenses
        await event.connect(user1).reclaimExpenses(parseEther("0.0034"));
        await event.connect(user2).reclaimExpenses(parseEther("0.0025"));
        await event.connect(user3).reclaimExpenses(parseEther("0.0019"));

        // Check if the correct amount is send to the contract
        expect(await event.connect(user1).getMyExpenses()).to.equal(parseEther("0.0034"));
        expect(await event.connect(user2).getMyExpenses()).to.equal(parseEther("0.0025"));
        expect(await event.connect(user3).getMyExpenses()).to.equal(parseEther("0.0019"));
        expect(await event.connect(user4).getMyExpenses()).to.equal(parseEther("0"));

        await event.connect(user4).reclaimExpenses(0);
        expect(await event.connect(user4).getMyExpenses()).to.equal(0);

        await event.connect(user3).reclaimExpenses(MAX_AMOUNT_TO_RECAIM - parseEther("0.001"));
        expect(await event.connect(user3).getMyExpenses()).to.equal(MAX_AMOUNT_TO_RECAIM - parseEther("0.001"));

        await expect(
            event.connect(user2).reclaimExpenses(MAX_AMOUNT_TO_RECAIM + parseEther("0.001"))
        ).to.be.revertedWith("It has to be more than 0 EUR and less than 0.0040 Ether");
        // The value was not overridden by the previous test
        expect(await event.connect(user2).getMyExpenses()).to.equal(parseEther("0.0025"));

        await snapshot.restore();

        await time.increaseTo((await event.getEventTime()));

        // test to reclaim expenses
        await event.connect(user1).reclaimExpenses(parseEther("0.0036"));
        await event.connect(user2).reclaimExpenses(parseEther("0.0025"));
        await event.connect(user3).reclaimExpenses(parseEther("0.0019"));
        await event.connect(user4).reclaimExpenses(parseEther("0"));

        // console.log("getExpenses: ", await event.connect(user1).showExpenses());

    });

    it('should be checked that the expenses entered correctly', async function () {
        const {event, owner, user1, user2, user3, user4, user5} = await loadFixture(deployContractAndSetVariables);

        await event.connect(user1).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        );

        await event.connect(user2).joinEvent(
            "Maria",
            "Schuster",
            "schuster@reher.hostingkunde.de",
            "+49 176 2231242342",
            8,
            {value: EVENT_FEE}
        );

        await event.connect(user3).joinEvent(
            "Mario",
            "Feldhalter",
            "feldhalter@reher.hostingkunde.de",
            "+49 176 3231242343",
            2,
            {value: EVENT_FEE}
        );

        await event.connect(user4).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        );

        // Distribute the event
        await time.increaseTo((await event.getEventClosingTime()));
        await event.distributeEvent();

        expect(await event.getEventStatus()).to.equal(BigInt(1));
        // Check if the paided value is send correctly after entering the expenses

        // take a snapshot of the current state of the blockchain
        const snapshot = await takeSnapshot();

        /*////////////////////////////////////////////////////////////////////////////////////////////*/
        /*//                                                                                        //*/
        /*//                    Test normal reclaimExpenses to the wrong time                       //*/
        /*//                                                                                        //*/
        /*////////////////////////////////////////////////////////////////////////////////////////////*/

        await time.increaseTo((await event.getEventTime()) - BigInt(50));
        await expect(
            event.connect(user1).reclaimExpenses(parseEther("0.0034"))
        ).to.be.revertedWith("You can only enter your expenses after the event started and within the withdraw time");

        await time.increaseTo((await event.getEventTime()) + BigInt(WITHDRAW_TIME_FRAME) + BigInt(50));
        await expect(
            event.connect(user1).reclaimExpenses(parseEther("0.0034"))
        ).to.be.revertedWith("You can only enter your expenses after the event started and within the withdraw time");

        await snapshot.restore();

        /*////////////////////////////////////////////////////////////////////////////////////////////*/
        /*//                                                                                        //*/
        /*//                       Test normal reclaimExpenses to event time                        //*/
        /*//                                                                                        //*/
        /*////////////////////////////////////////////////////////////////////////////////////////////*/

        await time.increaseTo((await event.getEventTime()));

        // enter reclaim expenses
        await event.connect(user1).reclaimExpenses(parseEther("0.0034"));
        await event.connect(user2).reclaimExpenses(parseEther("0.0025"));
        await event.connect(user3).reclaimExpenses(parseEther("0.0019"));

        // // Check if the correct amount is send to the contract
        expect(await event.connect(user1).getMyExpenses()).to.equal(parseEther("0.0034"));
        expect(await event.connect(user2).getMyExpenses()).to.equal(parseEther("0.0025"));
        expect(await event.connect(user3).getMyExpenses()).to.equal(parseEther("0.0019"));
        expect(await event.connect(user4).getMyExpenses()).to.equal(parseEther("0"));

    });

    it('should be checked that the event compensation is calculated correctly', async function () {
        const {event, owner, user1, user2, user3, user4, user5} = await loadFixture(deployContractAndSetVariables);

        await event.connect(user1).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        );

        await event.connect(user2).joinEvent(
            "Maria",
            "Schuster",
            "schuster@reher.hostingkunde.de",
            "+49 176 2231242342",
            8,
            {value: EVENT_FEE}
        );

        await event.connect(user3).joinEvent(
            "Mario",
            "Feldhalter",
            "feldhalter@reher.hostingkunde.de",
            "+49 176 3231242343",
            2,
            {value: EVENT_FEE}
        );

        // take a snapshot of the current state of the blockchain
        const snapshot = await takeSnapshot();

        /*////////////////////////////////////////////////////////////////////////////////////////////*/
        /*//                                                                                        //*/
        /*//                      Test normal withdraw all participant joined                       //*/
        /*//                                                                                        //*/
        /*////////////////////////////////////////////////////////////////////////////////////////////*/

        await event.connect(user4).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        );

        // Distribute the event
        await time.increaseTo((await event.getEventClosingTime()));
        await event.distributeEvent();

        await time.increaseTo((await event.getEventTime()));
        await event.connect(user1).reclaimExpenses(parseEther("0"));
        await event.connect(user2).reclaimExpenses(parseEther("0.0015"));
        await event.connect(user3).reclaimExpenses(parseEther("0.0005"));
        await event.connect(user4).reclaimExpenses(parseEther("0"));

        await time.increaseTo((await event.getEventTime() + BigInt(WITHDRAW_TIME_FRAME) - BigInt(30)));

        await event.connect(user2).confirmParticipation(user1.address);
        await event.connect(user3).confirmParticipation(user2.address);
        await event.connect(user2).confirmParticipation(user3.address);
        await event.connect(user1).confirmParticipation(user4.address);

        await time.increaseTo((await event.getEventTime() + BigInt(WITHDRAW_TIME_FRAME) + BigInt(30)));

        console.log("before 1. withdraw");
        const balanceEvent_start = await ethers.provider.getBalance(event.getAddress());
        const balance0ETH_start = await ethers.provider.getBalance(owner.address);
        const balance1ETH_start = await ethers.provider.getBalance(user1.address);
        const balance2ETH_start = await ethers.provider.getBalance(user2.address);
        const balance3ETH_start = await ethers.provider.getBalance(user3.address);
        const balance4ETH_start = await ethers.provider.getBalance(user4.address);

        // Check if the withdraw flag was set
        expect(await event.connect(user1).getWithDraw()).to.be.false;
        expect(await event.connect(user2).getWithDraw()).to.be.false;
        expect(await event.connect(user3).getWithDraw()).to.be.false;
        expect(await event.connect(user4).getWithDraw()).to.be.false;

        // 1. withdraw
        await event.connect(user1).withdraw();
        await event.connect(user2).withdraw();
        await event.connect(user3).withdraw();
        await event.connect(user4).withdraw();
        console.log("getExpenses: ", await event.connect(user1).showExpenses());

        // Check if the correct event compensaton was calculated
        expect(await event.connect(user1).getMyEventCompensation()).to.equal(parseEther("0.0005"));
        expect(await event.connect(user2).getMyEventCompensation()).to.equal(parseEther("0.0020"));
        expect(await event.connect(user3).getMyEventCompensation()).to.equal(parseEther("0.0010"));
        expect(await event.connect(user4).getMyEventCompensation()).to.equal(parseEther("0.0005"));

        // Check if the withdraw flag was set
        expect(await event.connect(user1).getWithDraw()).to.be.true;
        expect(await event.connect(user2).getWithDraw()).to.be.true;
        expect(await event.connect(user3).getWithDraw()).to.be.true;
        expect(await event.connect(user4).getWithDraw()).to.be.true;

        console.log("after 1. withdraw");
        const balanceEvent_end = await ethers.provider.getBalance(event.getAddress());
        console.log("balanceEvent", formatUnits(balanceEvent_end, "ether"));
        const balance0ETH_end = await ethers.provider.getBalance(owner.address);
        console.log("balance0ETH", formatUnits(balance0ETH_start - balance0ETH_end, "ether"));
        const balance1ETH_end = await ethers.provider.getBalance(user1.address);
        console.log("balance1ETH", formatUnits(balance1ETH_start - balance1ETH_end, "ether"));
        const balance2ETH_end = await ethers.provider.getBalance(user2.address);
        console.log("balance2ETH", formatUnits(balance2ETH_start - balance2ETH_end, "ether"));
        const balance3ETH_end = await ethers.provider.getBalance(user3.address);
        console.log("balance3ETH", formatUnits(balance3ETH_start - balance3ETH_end, "ether"));
        const balance4ETH_end = await ethers.provider.getBalance(user4.address);
        console.log("balance4ETH", formatUnits(balance4ETH_start - balance4ETH_end, "ether"));

        // TODO: Check withdraw

        await snapshot.restore();


        /*////////////////////////////////////////////////////////////////////////////////////////////*/
        /*//                                                                                        //*/
        /*//                   Test normal withdraw WITHOUT ONE participant joined                  //*/
        /*//                                                                                        //*/
        /*////////////////////////////////////////////////////////////////////////////////////////////*/

        await event.connect(user4).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        );

        await event.connect(user5).joinEvent(
            "Marc",
            "Foster",
            "foster@reher.hostingkunde.de",
            "+49 178 1231252322",
            6,
            {value: EVENT_FEE}
        );

        // Distribute the event
        await time.increaseTo((await event.getEventClosingTime()));
        await event.distributeEvent();

        await time.increaseTo((await event.getEventTime()));
        await event.connect(user1).reclaimExpenses(parseEther("0"));
        await event.connect(user2).reclaimExpenses(parseEther("0.0015"));
        await event.connect(user3).reclaimExpenses(parseEther("0.0005"));
        await event.connect(user4).reclaimExpenses(parseEther("0"));

        await time.increaseTo((await event.getEventTime() + BigInt(WITHDRAW_TIME_FRAME) - BigInt(30)));

        await event.connect(user2).confirmParticipation(user1.address);
        await event.connect(user3).confirmParticipation(user2.address);
        await event.connect(user2).confirmParticipation(user3.address);
        await event.connect(user1).confirmParticipation(user4.address);
        // User 5 will NOT confirmed

        await time.increaseTo((await event.getEventTime() + BigInt(WITHDRAW_TIME_FRAME) + BigInt(30)));

        // 2. withdraw
        await event.connect(user1).withdraw();
        await event.connect(user2).withdraw();
        await event.connect(user3).withdraw();
        await event.connect(user4).withdraw();

        // Check if the correct event compensaton was calculated
        expect(await event.connect(user1).getMyEventCompensation()).to.equal(parseEther("0.00075"));
        expect(await event.connect(user2).getMyEventCompensation()).to.equal(parseEther("0.00225"));
        expect(await event.connect(user3).getMyEventCompensation()).to.equal(parseEther("0.00125"));
        expect(await event.connect(user4).getMyEventCompensation()).to.equal(parseEther("0.00075"));
        expect(await event.connect(user5).getMyEventCompensation()).to.equal(parseEther("0"));

        await snapshot.restore();

        /*////////////////////////////////////////////////////////////////////////////////////////////*/
        /*//                                                                                        //*/
        /*//                   Test normal withdraw WITHOUT TWO participant joined                  //*/
        /*//                                                                                        //*/
        /*////////////////////////////////////////////////////////////////////////////////////////////*/

        await event.connect(user4).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        );

        await event.connect(user5).joinEvent(
            "Marc",
            "Foster",
            "foster@reher.hostingkunde.de",
            "+49 178 1231252322",
            6,
            {value: EVENT_FEE}
        );

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
        ).to.be.revertedWith("You can only widthdraw your ether after the withdraw time");

        await time.increaseTo((await event.getEventTime()));

        // Check if the withdraw function only works in the right event time frame
        await expect(
            event.connect(user2).withdraw()
        ).to.be.revertedWith("You can only widthdraw your ether after the withdraw time");

        await event.connect(user1).reclaimExpenses(parseEther("0"));
        await event.connect(user2).reclaimExpenses(parseEther("0.0015"));
        await event.connect(user3).reclaimExpenses(parseEther("0.0005"));
        await event.connect(user4).reclaimExpenses(parseEther("0"));

        await time.increaseTo((await event.getEventTime() + BigInt(WITHDRAW_TIME_FRAME) - BigInt(30)));

        // Check if the withdraw function only works in the right event time frame
        await expect(
            event.connect(user2).withdraw()
        ).to.be.revertedWith("You can only widthdraw your ether after the withdraw time");

        await event.connect(user2).confirmParticipation(user1.address);
        await event.connect(user3).confirmParticipation(user2.address);
        await event.connect(user2).confirmParticipation(user3.address);
        // User 4 will NOT confirmed
        // User 5 will NOT confirmed

        await time.increaseTo((await event.getEventTime() + BigInt(WITHDRAW_TIME_FRAME) + BigInt(30)));

        // 3. withdraw
        await event.connect(user1).withdraw();
        await event.connect(user2).withdraw();
        await event.connect(user3).withdraw();
        await event.connect(user4).withdraw();

        // Check if the correct event compensaton was calculated
        expect(await event.connect(user1).getMyEventCompensation()).to.equal(parseEther("0.0010"));
        expect(await event.connect(user2).getMyEventCompensation()).to.equal(parseEther("0.0025"));
        expect(await event.connect(user3).getMyEventCompensation()).to.equal(parseEther("0.0015"));
        expect(await event.connect(user4).getMyEventCompensation()).to.equal(parseEther("0"));
        expect(await event.connect(user5).getMyEventCompensation()).to.equal(parseEther("0"));

        await snapshot.restore();

        /*////////////////////////////////////////////////////////////////////////////////////////////*/
        /*//                                                                                        //*/
        /*//                Test ???                //*/
        /*//                                                                                        //*/
        /*////////////////////////////////////////////////////////////////////////////////////////////*/

        await event.connect(user4).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        );

        // Distribute the event
        await time.increaseTo((await event.getEventClosingTime()));
        await event.distributeEvent();

        await time.increaseTo((await event.getEventTime()));
        await event.connect(user1).reclaimExpenses(parseEther("0"));
        await event.connect(user2).reclaimExpenses(parseEther("0.0015"));
        await event.connect(user3).reclaimExpenses(parseEther("0.0005"));
        await event.connect(user4).reclaimExpenses(parseEther("0"));

        await time.increaseTo((await event.getEventTime() + BigInt(WITHDRAW_TIME_FRAME) - BigInt(30)));

        await event.connect(user2).confirmParticipation(user1.address);
        await event.connect(user3).confirmParticipation(user2.address);
        await event.connect(user2).confirmParticipation(user3.address);
        await event.connect(user2).confirmParticipation(user4.address);

        // 4. withdraw
        // await event.connect(user2).withdraw();

        // Check if the correct event compensaton was calculated
        // expect(await event.connect(user1).getMyEventCompensation()).to.equal(parseEther("0.0010"));
        // expect(await event.connect(user2).getMyEventCompensation()).to.equal(parseEther("0.0025"));
        // expect(await event.connect(user3).getMyEventCompensation()).to.equal(parseEther("0.0015"));
        // expect(await event.connect(user4).getMyEventCompensation()).to.equal(parseEther("0"));

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
        // const balanceEvent = await ethers.provider.getBalance(event.getAddress());
        // console.log("balanceEvent", balanceEvent);
        // const balance0ETH = await ethers.provider.getBalance(owner.address);
        // console.log("balance0ETH", balance0ETH);
        // const balance1ETH = await ethers.provider.getBalance(user1.address);
        // console.log("balance1ETH", balance1ETH);
        // const balance2ETH = await ethers.provider.getBalance(user2.address);
        // console.log("balance2ETH", balance2ETH);
        // const balance3ETH = await ethers.provider.getBalance(user3.address);
        // console.log("balance3ETH", balance3ETH);

        // console.log("getExpenses: ", await event.connect(user1).showExpenses());

    });

    it('should be checked that the participation is correctly confirmed', async function () {
        const {event, owner, user1, user2, user3, user4, user5} = await loadFixture(deployContractAndSetVariables);

        await event.connect(user1).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        );

        await event.connect(user2).joinEvent(
            "Maria",
            "Schuster",
            "schuster@reher.hostingkunde.de",
            "+49 176 2231242342",
            8,
            {value: EVENT_FEE}
        );

        await event.connect(user3).joinEvent(
            "Mario",
            "Feldhalter",
            "feldhalter@reher.hostingkunde.de",
            "+49 176 3231242343",
            2,
            {value: EVENT_FEE}
        );

        await event.connect(user4).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        );

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

        await time.increaseTo((await event.getEventTime()));

        // You can't confirm yourself
        await expect(
            event.connect(user3).confirmParticipation(user3.address)
        ).to.be.revertedWith("Another user has to confirm you!");

        // Only participants can confirm users, who joined the event
        await expect(
            event.connect(user5).confirmParticipation(user3.address)
        ).to.be.revertedWith("Only participants can use this function");

        await expect(
            event.connect(user3).confirmParticipation(user5.address)
        ).to.be.revertedWith("There is no value for this address");

        // take a snapshot of the current state of the blockchain
        const snapshot = await takeSnapshot();

        // test the confirm Participation function
        expect(await event.connect(user1).isConfirmed()).to.false;
        expect(await event.connect(user2).isConfirmed()).to.false;
        expect(await event.connect(user3).isConfirmed()).to.false;

        await event.connect(user2).confirmParticipation(user1.address);
        await event.connect(user3).confirmParticipation(user2.address);
        await event.connect(user2).confirmParticipation(user3.address);

        expect(await event.connect(user1).isConfirmed()).to.true;
        expect(await event.connect(user2).isConfirmed()).to.true;
        expect(await event.connect(user3).isConfirmed()).to.true;

        // console.log("getExpenses: ", await event.connect(user1).showExpenses());
    });

    it('should be checked that the event status works correctly with the participation confirmation', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);
        

        await event.connect(user1).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        );

        await event.connect(user2).joinEvent(
            "Maria",
            "Schuster",
            "schuster@reher.hostingkunde.de",
            "+49 176 2231242342",
            8,
            {value: EVENT_FEE}
        );

        await event.connect(user3).joinEvent(
            "Mario",
            "Feldhalter",
            "feldhalter@reher.hostingkunde.de",
            "+49 176 3231242343",
            2,
            {value: EVENT_FEE}
        );

        // Check Active status
        await expect(
            event.connect(user3).confirmParticipation(user2.address)
        ).to.be.revertedWith("This event has to be distributed or ended");

        // Check Distributed status
        // TODO: replace numbers with constants
        event.connect(owner).setEventStatus(1);
        await time.increaseTo((await event.getEventTime()));
        await expect(
            event.connect(user3).confirmParticipation(user3.address)
        ).to.be.revertedWith("Another user has to confirm you!");


        expect(await event.connect(user1).isConfirmed()).to.false;
        expect(await event.connect(user2).isConfirmed()).to.false;
        expect(await event.connect(user3).isConfirmed()).to.false;

        await event.connect(user3).confirmParticipation(user2.address);
        expect(await event.connect(user2).isConfirmed()).to.true;
        await event.connect(user2).confirmParticipation(user3.address);
        expect(await event.connect(user3).isConfirmed()).to.true;
        await event.connect(user2).confirmParticipation(user1.address);
        expect(await event.connect(user1).isConfirmed()).to.true;

        // Check Ended status
        event.connect(owner).setEventStatus(2);
        await event.connect(user3).confirmParticipation(user1.address);

        // Check Cancel status
        event.connect(owner).setEventStatus(3);
        await expect(
            event.connect(user3).confirmParticipation(user1.address)
        ).to.be.revertedWith("This event has to be distributed or ended");

        // TODO: Check the withdraw time
        // console.log("getExpenses: ", await event.getExpenses());
    });

    it('should be tested that the event cancelation works', async function () {
        const {event, owner, user1, user2, user3, user4, user5} = await loadFixture(deployContractAndSetVariables);
        

        await expect(event.connect(user1).cancelEvent()).to.be.revertedWith("Only the owner can call this function");
        await expect(event.connect(user2).cancelEvent()).to.be.revertedWith("Only the owner can call this function");

        await event.connect(owner).joinEvent(
            "Mira",
            "Husten",
            "husten@reher.hostingkunde.de",
            "+49 152 4251242341",
            6,
            {value: EVENT_FEE}
        );

        await event.connect(user1).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        );

        await event.connect(user2).joinEvent(
            "Maria",
            "Schuster",
            "schuster@reher.hostingkunde.de",
            "+49 176 2231242342",
            8,
            {value: EVENT_FEE}
        );

        await event.connect(user3).joinEvent(
            "Mario",
            "Feldhalter",
            "feldhalter@reher.hostingkunde.de",
            "+49 176 3231242343",
            2,
            {value: EVENT_FEE}
        );

        await event.connect(user4).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        )
        await event.cancelEvent();
        // Check that no participants are in the event
        expect(await event.participantCount()).to.equal(BigInt("0"));
        // Check the Cancel Status
        expect(await event.eventStatus()).to.equal("3");
    });

    it('should be tested that the cancelation of a participant works', async function () {
        const {event, owner, user1, user2, user5} = await loadFixture(deployContractAndSetVariables);
        expect(await event.participantCount()).to.equal(BigInt("0"));
        

        // console.log("getParticipants 1: ", await event.getParticipants());
        await event.connect(user1).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: EVENT_FEE}
        );
        expect(await event.participantCount()).to.equal(BigInt("1"));
        // console.log("getParticipants Mapping: ", await event.connect(user1).getParticipants_m());

        // Cancel from a user who hasn't joined the event
        await expect(event.connect(user2).cancelParticipant()).to.be.revertedWith("Only participants can use this function");
        await expect(event.connect(user5).cancelParticipant()).to.be.revertedWith("Only participants can use this function");

        await event.connect(user1).cancelParticipant();
        // await expect(await event.connect(user1).cancelEvent()).to.be.equal(true);
        // console.log("getParticipants 2: ", await event.getParticipants());
        // console.log("getParticipants Mapping: ", await event.connect(user1).getParticipants_m());
        await expect(await event.participantCount()).to.equal(BigInt("0"));

        // The owner can not cancel the event
        await expect(event.connect(owner).cancelParticipant()).to.be.revertedWith("As an owner you can't call this function");
    });

    it('is not clear, difference walletUser1 and user1', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);

        // Local testnet
        const url = process.env.TESTNET_RPC_URL_LOCAL;
        const provider = new JsonRpcProvider(url);
        let walletUser0 = new Wallet(process.env.TESTNET_PRIVATE_KEY_USER0, provider);
        let walletUser1 = new Wallet(process.env.TESTNET_PRIVATE_KEY_USER1, provider);
        let walletUser2 = new Wallet(process.env.TESTNET_PRIVATE_KEY_USER2, provider);
        let walletUser3 = new Wallet(process.env.TESTNET_PRIVATE_KEY_USER3, provider);
        let walletUser4 = new Wallet(process.env.TESTNET_PRIVATE_KEY_USER4, provider);

        // console.log("user1: ", user1);
        // console.log("walletUser1: ", walletUser1);
    });

    it('update event title', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);
        expect(await event.title()).to.equal("First Cooking Event");
        const tx = await event.setTitle("Event Title Update A");
        expect(await event.title()).to.equal("Event Title Update A");
    });

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

    }
});

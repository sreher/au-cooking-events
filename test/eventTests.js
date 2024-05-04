const {loadFixture} = require('@nomicfoundation/hardhat-network-helpers');
const {time} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {expect} = require('chai');
const {JsonRpcProvider, Wallet, parseEther, formatUnits} = require("ethers");

const hourInSeconds = 3600;
const dayInSeconds = 86400;

describe('Event', function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployContractAndSetVariables() {
        const Event = await ethers.getContractFactory('Event');
        const event = await Event.deploy(
            "First Cooking Event",
            "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed.",
            (await time.latest()) + (1 * hourInSeconds) + 10,
            parseEther("1.0")
        );

        const event2 = await Event.deploy(
            "Second Cooking Event",
            "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed.",
            (await time.latest()) + (1 * hourInSeconds) + 10,
            parseEther("1.0")
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

        console.log("user1: ", user1);
        console.log("walletUser1: ", walletUser1);
    });

    it('should be tested, that a user can only entered once', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);
        let _eventFee = parseEther("1.0");

        await event.connect(user2).joinEvent(
            "Maria",
            "Schuster",
            "schuster@reher.hostingkunde.de",
            "+49 176 2231242342",
            8,
            {value: _eventFee}
        );

        await expect(
            event.connect(user2).joinEvent(
                "Marion",
                "Hamster",
                "hamster@reher.hostingkunde.de",
                "+49 176 5673124234",
                8,
                {value: _eventFee}
            )
        ).to.be.revertedWith("the user have already joined the event");
    });

    it('event status changes', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);
        let _eventFee = parseEther("1.0");

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
                {value: _eventFee}
            )
        ).to.be.revertedWith("this event isn't active anymore");
    });

    it('event closed', async function () {
        const {event2, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);
        let _eventFee = parseEther("1.0");
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
            {value: _eventFee}
        );
        await time.increaseTo(timeNow + 180);
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
                {value: _eventFee}
            )
        ).to.be.revertedWith("this event is closed");

        // console.log("Time end: " + await time.latest());

        const getParticipants = await event2.getParticipants();
        console.log("getParticipants: ", getParticipants);
    });

    it('the participant should be correct add to the event', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);
        let _eventFee = parseEther("1.0");

        // const url = process.env.TESTNET_RPC_URL_LOCAL;
        // const provider = new JsonRpcProvider(url);
        // let walletUser0 = new Wallet(process.env.TESTNET_PRIVATE_KEY_USER0, provider);
        // let walletUser1 = new Wallet(process.env.TESTNET_PRIVATE_KEY_USER1, provider);
        // let walletUser2 = new Wallet(process.env.TESTNET_PRIVATE_KEY_USER2, provider);
        // let walletUser3 = new Wallet(process.env.TESTNET_PRIVATE_KEY_USER3, provider);
        // let walletUser4 = new Wallet(process.env.TESTNET_PRIVATE_KEY_USER4, provider);

        // console.log("balanceContractETH: ", ethers.formatEther((await provider.getBalance(event.getAddress())).toString()));

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
            {value: _eventFee}
        );

        // expect(await event.testValue()).to.equal(parseEther("1.0"));
        // expect(await event.testSender()).to.equal(user4.address);

        expect(await event.participantCount()).to.equal(BigInt("1"));
        const userBalance1 = await event.balanceOf(user1.address);
        // TODO: explain
        expect(userBalance1).to.equal(0);

        await event.connect(user2).joinEvent(
            "Maria",
            "Schuster",
            "schuster@reher.hostingkunde.de",
            "+49 176 2231242342",
            8,
            {value: _eventFee}
        );

        expect(await event.participantCount()).to.equal(BigInt("2"));
        const userBalance2 = await event.balanceOf(user2.address);
        // TODO: explain
        expect(userBalance2).to.equal(0);

        await event.connect(user3).joinEvent(
            "Mario",
            "Feldhalter",
            "feldhalter@reher.hostingkunde.de",
            "+49 176 3231242343",
            0,
            {value: _eventFee}
        );

        expect(await event.participantCount()).to.equal(BigInt("3"));
        const userBalance3 = await event.balanceOf(user3.address);
        // TODO: explain
        expect(userBalance3).to.equal(0);

        const getParticipants = await event.getParticipants();
        console.log("getParticipants: ", getParticipants);

        const getExpenses = await event.getExpenses();
        console.log("getExpenses: ", getExpenses);
    });

    it('check event seats', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);
        let _eventFee = parseEther("1.0");

        await event.connect(user3).joinEvent(
            "Mario",
            "Feldhalter",
            "feldhalter@reher.hostingkunde.de",
            "+49 176 3231242343",
            2,
            {value: _eventFee}
        );

        console.log("Seats: ", await event.getEventSeats());
        expect(await event.getEventSeats()).to.equal(BigInt(2));

        await event.connect(user2).joinEvent(
            "Maria",
            "Schuster",
            "schuster@reher.hostingkunde.de",
            "+49 176 2231242342",
            8,
            {value: _eventFee}
        );

        await expect(
            event.connect(user4).joinEvent(
                "John",
                "Smith",
                "smith@reher.hostingkunde.de",
                "+49 176 1231242341",
                8,
                {value: _eventFee}
            )
        ).to.be.revertedWith("there are no more seats");

        await expect(
            event.connect(user1).joinEvent(
                "John",
                "Smith",
                "smith@reher.hostingkunde.de",
                "+49 176 1231242341",
                8,
                {value: _eventFee}
            )
        ).to.be.revertedWith("there are no more seats");
    });

    it('check less than minimum event seats', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);
        let _eventFee = parseEther("1.0");

        await expect(
            event.connect(user1).joinEvent(
                "Mario",
                "Feldhalter",
                "feldhalter@reher.hostingkunde.de",
                "+49 176 3231242343",
                1,
                {value: _eventFee}
            )
        ).to.be.revertedWith("The minimum seats are four");

        await event.connect(user4).joinEvent(
            "Mario",
            "Feldhalter",
            "feldhalter@reher.hostingkunde.de",
            "+49 176 3231242343",
            5,
            {value: _eventFee}
        )

        expect(await event.getEventSeats()).to.equal(BigInt(5));
    });

    it('update event title', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);
        expect(await event.title()).to.equal("First Cooking Event");
        const tx = await event.setTitle("Event Title Update A");
        expect(await event.title()).to.equal("Event Title Update A");
    });

    it('test msg.sender', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);
        await event.getMsgSender();
        expect(await event.testSender()).to.equal(owner.address);
        await event.connect(user2).getMsgSender();
        expect(await event.testSender()).to.equal(user2.address);
        await event.connect(user3).getMsgSender();
        expect(await event.testSender()).to.equal(user3.address);
    });

    it('test join Event Static', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);

        await event.joinEventStatic();
        expect(await event.participantCount()).to.equal(BigInt("1"));
        const getParticipants = await event.getParticipants();
        console.log("getParticipants: ", getParticipants);

        expect(getParticipants[0].firstname).to.equal("_firstname");
        expect(getParticipants[0].lastname).to.equal("_lastname");
        expect(getParticipants[0].email).to.equal("_email");
        expect(getParticipants[0].telephone).to.equal("_telephone");
        expect(getParticipants[0].event_fee).to.equal("1000000000000000000");
        expect(getParticipants[0].seats).to.equal(BigInt("6"));
        expect(getParticipants[0].attended).to.equal(true);

        const participantCount = await event.participantCount();
        expect(participantCount).to.equal(1);
        console.log("participantCount: ", participantCount);

        const balances = await event.balanceOf(user2.address);
        console.log("balances: ", balances);
    });

    // TODO: fix the test "incorrect fee"
    it('incorrect fee', async function () {
        const {event, owner, user1, user2, user3, user4} = await loadFixture(deployContractAndSetVariables);

        const tx = await event.connect(user4).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: parseEther("1.0")},
        );

        const participantCount = await event.participantCount();
        console.log("participantCount: ", participantCount);

        const getParticipants = await event.getParticipants();
        console.log("getParticipants: ", getParticipants);
    });

    it('check the participant count', async function () {
        const {event, owner} = await loadFixture(deployContractAndSetVariables);

        console.log("Count: ", await event.participantCount());
        expect(await event.participantCount()).to.equal(BigInt("0"));
    });

    it('cancel event', async function () {
        const {event, owner, user1, user2, user5} = await loadFixture(deployContractAndSetVariables);
        expect(await event.participantCount()).to.equal(BigInt("0"));
        let _eventFee = parseEther("1.0");

        // console.log("getParticipants 1: ", await event.getParticipants());
        await event.connect(user1).joinEvent(
            "John",
            "Smith",
            "smith@reher.hostingkunde.de",
            "+49 176 1231242341",
            8,
            {value: _eventFee}
        );
        expect(await event.participantCount()).to.equal(BigInt("1"));
        console.log("getParticipants Mapping: ", await event.connect(user1).getParticipants_m());

        await expect(event.connect(user2).cancelEvent()).to.be.revertedWith("Only participants can use this function");
        await expect(event.connect(user5).cancelEvent()).to.be.revertedWith("Only participants can use this function");

        await event.connect(user1).testMappingStructs();
        // await expect(await event.connect(user1).cancelEvent()).to.be.equal(true);
        console.log("getParticipants 2: ", await event.getParticipants());
        console.log("getParticipants Mapping: ", await event.connect(user1).getParticipants_m());
        // expect(await event.participantCount()).to.equal(BigInt("0"));
    });

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

});

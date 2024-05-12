// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "hardhat/console.sol";

contract Event {
    address payable public owner;

    // Variables
    string public title;
    string public description;
    // convert from js to timestamp
    uint public eventDate;
    uint public eventFee;
    uint public participantCount;
    bool private compensationCalculated;
    EventStatus public eventStatus;
    // TODO: remove when kitchen feature is implemented
    uint public eventSeats;


    // Constants
    uint constant private DAY_IN_SECONDS = 86400;
    uint constant private HOUR_IN_SECONDS = 3600;
    uint constant private MIN_PARTICIPANTS = 4;
    uint constant private ENDED_TIME_FRAME = 5 * HOUR_IN_SECONDS;
    uint constant private CLOSING_TIME_FRAME = 24 * HOUR_IN_SECONDS;
    uint constant private WITHDRAW_TIME_FRAME = 48 * HOUR_IN_SECONDS;
    uint constant private MAX_AMOUNT_TO_RECAIM = 0.0040 * 1e18;

    // Events
    event Received(address, uint);

    enum EventStatus { ACTIVE, DISTRIBUTED, ENDED, CANCELED }

    struct ParticipantDouble{
        uint index;
        bool isValue;
    }

    struct Participant {
        address participant;
        string firstname;
        string lastname;
        string email;
        string telephone;
        uint event_fee;
        uint seats;
        bool attended;
    }
    Participant[] public participants_a;

    struct Expense {
        address participant;
        uint amount;
        bool reclaimed;
        bool confirmed;
        // TODO: can remove
        bool paided;
        uint event_compensation;
        bool withdraw;
    }
    Expense[] private expenses_a;

    // Data structure
    mapping(address => ParticipantDouble) public participant_m;
    mapping(address => Expense) public expenses_m;

    constructor(
        string memory _title,
        string memory _description,
        uint _eventDate,
        uint _eventFee
    ) {
        owner = payable(msg.sender);
        title = _title;
        description = _description;
        eventDate = _eventDate;
        eventStatus = EventStatus.ACTIVE;
        eventFee = _eventFee;
    }

    function joinEvent (
        string memory _firstname,
        string memory _lastname,
        string memory _email,
        string memory _telephone,
        uint _seats
    ) public payable returns(bool) {
        // TODO: change it to error
        require(msg.value == eventFee, "The correct eventFee has to be paid");
        require(!userJoined(msg.sender), "The user have already joined the event");
        require(eventStatus == EventStatus.ACTIVE, "This event isn't active anymore");

        // TODO: remove this later when the kitchen feature is implemented
        if (participants_a.length > 0) {
            // with the first participant the eventSeats will be set
            require(participants_a.length < eventSeats, "There are no more seats");
        }

        // one hour/day before the event the registration will be closed
        require(block.timestamp < (eventDate - CLOSING_TIME_FRAME) , "this event is closed");

        Participant memory participants_s = Participant({
            participant: msg.sender,
            firstname: _firstname,
            lastname: _lastname,
            email: _email,
            telephone: _telephone,
            event_fee: msg.value,
            seats: _seats,
            attended: true
        });
        participants_a.push(participants_s);
        participant_m[msg.sender].index = participants_a.length - 1;
        participant_m[msg.sender].isValue = true;

        Expense memory expense_s = Expense({
            participant: msg.sender,
            amount: 0,
            reclaimed: false,
            paided: false,
            confirmed: false,
            event_compensation: 0,
            withdraw: false
        });
        expenses_a.push(expense_s);
        expenses_m[msg.sender] = expense_s;

        // the first participant will be the host
        if (participants_a.length == 1) {
            require(_seats >= 4, "The minimum seats are four");
            eventSeats = _seats;
        }

        participantCount++;
        return true;
    }

    function cancelEvent() external onlyOwner returns(bool) {
        require(eventStatus == EventStatus.ACTIVE, "This event isn't active anymore");
        uint participantsCounter = participants_a.length;
        for(uint i=0; i < participantsCounter; i++) {
            uint _event_fee = participants_a[0].event_fee;
            address participant = participants_a[0].participant;
            (bool success, ) = participant.call{value: _event_fee}("");
            require(success, "send back event fee transaction failed");
            // The participant leaves the event
            _removeParticipants(0);
            delete participant_m[msg.sender];
            participant_m[msg.sender].isValue = false;
            // Reduce participant count
            participantCount--;
        }
        setEventStatus(EventStatus.CANCELED);
        return true;
    }

    function cancelParticipant() external notOwner onlyParticipants returns(bool) {
        require(eventStatus == EventStatus.ACTIVE, "This event isn't active anymore");

        // Pay back the Event fee
        uint index = participant_m[msg.sender].index;
        uint _event_fee = participants_a[index].event_fee;
        (bool success, ) = msg.sender.call{value: _event_fee}("");
        require(success, "send back event fee transaction failed");

        // The participant leaves the event
        _removeParticipants(index);
        delete participant_m[msg.sender];

        // Reduce participant count
        participantCount--;

        // TODO: The Date/Time of the event is more than 24 hours away OR Event Status == ENDED OR Event Status == DISTRIBUTED
        return true;
    }

    function distributeEvent() external onlyOwner returns(bool) {
        require(eventStatus == EventStatus.ACTIVE, "Only active events can be distributed");
        require(participantCount >= MIN_PARTICIPANTS, "The minimum number of participants has not been reached");
        require(block.timestamp >= eventDate - CLOSING_TIME_FRAME && block.timestamp <= eventDate, "You can only distribute 24 hours before the event started");

        setEventStatus(EventStatus.DISTRIBUTED);
        return true;
    }

    //TODO: convert from ether to eur and via versa
    function reclaimExpenses(uint amount) external onlyParticipants returns(bool) {
        require(eventStatus == EventStatus.DISTRIBUTED || eventStatus == EventStatus.ENDED, "Expenses can only be entered for distributed or ended events");
        require(block.timestamp >= eventDate && block.timestamp <= eventDate + WITHDRAW_TIME_FRAME, "You can only enter your expenses after the event started and within the withdraw time");
        require(amount >= 0 && amount <= MAX_AMOUNT_TO_RECAIM, "It has to be more than 0 EUR and less than 0.0040 Ether");

        uint index = participant_m[msg.sender].index;
        expenses_a[index].amount = amount;
        expenses_a[index].reclaimed = true;

        // TODO: to be tested
        // If the withdraw function will call X hours after the eventDate, then the Event Status will set to Ended
        setEventStatusEnded();
        return true;
    }

    function showExpenses() public view onlyParticipants returns(Expense[] memory) {
        require(eventStatus == EventStatus.DISTRIBUTED || eventStatus == EventStatus.ENDED, "Expenses can only be entered for distributed or ended events");
        // require(block.timestamp >= eventDate && block.timestamp <= eventDate + WITHDRAW_TIME_FRAME, "You can only enter your expenses after the event started and within the withdraw time");

        return expenses_a;
//        for(uint i=0; i < expenses_a.length; i++) {
//            if (expenses_a[i].paided) {
//                Expense expense = new Expense({
//                    participant: expenses_a[i].participant,
//                    amount: expenses_a[i].amount,
//                    confirmed: expenses_a[i].confirmed,
//                    withdraw: expenses_a[i].withdraw,
//                });
//                expenses.push(expense);
//            }
//        }
//        return expenses;
    }

    // TODO: expand this function to handle more than one address
    function confirmParticipation(address _addr1) external onlyParticipants returns(bool) {
        require(eventStatus == EventStatus.DISTRIBUTED || eventStatus == EventStatus.ENDED, "This event has to be distributed or ended");
        require(block.timestamp >= eventDate && block.timestamp <= eventDate + WITHDRAW_TIME_FRAME, "You can only confirm others after the event started and within the withdraw time");
        require(msg.sender != _addr1, "Another user has to confirm you!");

        // Set Participation of the participant to CONFIRMED
        require(participant_m[_addr1].isValue, "There is no value for this address");
        uint index = participant_m[_addr1].index;
        expenses_a[index].confirmed = true;

        // TODO: to be tested
        // If the withdraw function will call X hours after the eventDate, then the Event Status will set to Ended
        setEventStatusEnded();
        return true;
    }

    function calcEventCompensation() internal onlyParticipants returns(bool) {
//        console.log("calcEventCompensation");
        // When all confirmed and reclaim their expenses or time over
        uint allEventFees = 0;
        uint allExpenses = 0;
        uint penalty = 0;
        uint eventCompensation = 0;
        uint confirmedParticipation;
        for (uint i=0; i < expenses_a.length; i++) {
            allEventFees += participants_a[i].event_fee;
            allExpenses += expenses_a[i].amount;
            confirmedParticipation += expenses_a[i].confirmed ? 1 : 0;
        }

        require(confirmedParticipation > 0, "There are no confirmed participants in the event");
//        console.log("allEventFees:           ", allEventFees);
//        console.log("allExpenses:            ", allExpenses);
//        console.log("confirmedParticipation: ", confirmedParticipation);
        // Distributing the event fees of non-participants
        if (participantCount != confirmedParticipation) {
            penalty = (participantCount - confirmedParticipation) * eventFee / confirmedParticipation;
        }
//        console.log("penalty:               ", penalty);

        uint costPerParticipant = allExpenses / confirmedParticipation;
//        console.log("costPerParticipant     ", costPerParticipant);

        for (uint i = 0; i < expenses_a.length; i++) {
            if (expenses_a[i].confirmed) {
                // event_compensation will be only calculated for attending users
                uint getBack = (participants_a[i].event_fee + expenses_a[i].amount + penalty);
//                console.log("getBack               ", getBack);
                eventCompensation = getBack - costPerParticipant;
//                console.log("eventCompensation      ", eventCompensation);
                expenses_a[i].event_compensation = eventCompensation;
            } else {
                // no event compensation for  for non-participating users
                expenses_a[i].event_compensation = 0;
            }
        }
        return true;
    }

    function withdraw() external onlyParticipants returns(bool) {
        require(eventStatus == EventStatus.DISTRIBUTED || eventStatus == EventStatus.ENDED, "Expenses can only be entered for distributed or ended events");
        require(block.timestamp >= eventDate + ENDED_TIME_FRAME && block.timestamp <= eventDate + WITHDRAW_TIME_FRAME, "You can only withdraw your ether when the event has ended and within the withdraw time frame");
        // At the moment the check is not necessary because the withdraw is only possible afer the withdraw time
        // require(checkExpensesAndConfirmation(), "Not all participation are confirmed or not all expenses reclaimed");

        // TODO: It should be possible to withdraw your money earlier, when all participants are confirmed.
        // TODO: What happens, when no participants are confirmed in the time frame?
        // TODO: What happens, when no participants withdraw their money?

        if (!compensationCalculated) {
            // Only run once, to calculate the event compensation
            calcEventCompensation();
            compensationCalculated = true;
        }

        // Send the compensation to the msg.sender
        uint _index = participant_m[msg.sender].index;
        uint _event_compensation = expenses_a[_index].event_compensation;
//        console.log("Balance before: ", address(this).balance);
//        console.log("User Balance before: ", msg.sender.balance);
//        console.log(msg.sender, " -- ", _event_compensation);
        (bool success, ) = msg.sender.call{value: _event_compensation}("");
        require(success, "send back event compensation - transaction failed");
//        console.log("Balance after: ", address(this).balance);
//        console.log("User Balance after: ", msg.sender.balance);
        expenses_a[_index].withdraw = true;

        // TODO: to be tested
        // If the withdraw function will call X hours after the eventDate, then the Event Status will set to Ended
        setEventStatusEnded();

        return true;
    }

    /************************  Utility functions  ************************************************/

    function checkExpensesAndConfirmation() view internal onlyParticipants returns(bool) {
        // When all confirmed and reclaim their expenses or time over
//        console.log("checkExpensesAndConfirmation");
        for (uint i = 0; i < expenses_a.length; i++) {
            if (!expenses_a[i].reclaimed || !expenses_a[i].confirmed) {
                // When the request is out of withdraw time, then the process should continue, ex. the calc the compensation
                if(block.timestamp >= eventDate && block.timestamp <= eventDate + WITHDRAW_TIME_FRAME) {
                    return false;
                }
            }
        }
        return true;
    }

    function setEventStatusEnded() internal {
        require(eventStatus == EventStatus.DISTRIBUTED || eventStatus == EventStatus.ENDED, "The event has been distributed and is not in finished status.");
        // Set the event to Ended, when a function call happens later than the Ended Time
        if (block.timestamp >= eventDate + ENDED_TIME_FRAME && eventStatus != EventStatus.ENDED) {
            eventStatus = EventStatus.ENDED;
        }
    }

    // TODO: Test this function more
    function userJoined(address _addr1) public view returns(bool) {
        require(_addr1 != address(0));
        // TODO: optimize it
        for(uint i = 0; i < participants_a.length; i++) {
            if (participants_a[i].participant == _addr1) {
                return true;
            }
        }
        return false;
    }

    function getParticipants_m() external view returns (string memory) {
        uint index = participant_m[msg.sender].index;
        return participants_a[index].firstname;
    }

    function getExpenses() external view returns (Expense[] memory) {
        return expenses_a;
    }

    function isConfirmed() external view returns (bool) {
        uint index = participant_m[msg.sender].index;
        // console.log("isConfirmed", expenses_a[index].participant);
        return expenses_a[index].confirmed;
    }

    function getUserExpenses() external view returns (uint, bool) {
        uint index = participant_m[msg.sender].index;
        return (expenses_a[index].amount, expenses_a[index].reclaimed);
    }

    function getWithDraw() external view returns (bool) {
        uint index = participant_m[msg.sender].index;
        return expenses_a[index].withdraw;
    }

    function getMyExpenses() external view returns (uint) {
        uint index = participant_m[msg.sender].index;
        return expenses_a[index].amount;
    }

    function getMyEventCompensation() external view returns (uint) {
        uint index = participant_m[msg.sender].index;
        return expenses_a[index].event_compensation;
    }

    function getBlockTime() external view returns (uint) {
        return block.timestamp;
    }

    function getEventClosingTime() external view returns (uint) {
        return (eventDate - CLOSING_TIME_FRAME);
    }

    function getEventTime() external view returns (uint) {
        return eventDate;
    }

    function getEventStatus() public view returns(EventStatus) {
        return eventStatus;
    }

    function getEventSeats() public view returns(uint) {
        return eventSeats;
    }

    function setEventStatus(EventStatus _eventStatus) public onlyOwner {
        // TODO: prevent "value out-of-bounds" errors
        eventStatus = _eventStatus;
    }

    /************************  Test Function  ************************************************/
//
//    function getMsgSender() public {
//        testSender = msg.sender;
//    }
//
//    function getMsgValue() public payable {
//        testValue = msg.value;
//    }
//
//    // TODO: remove it
//    function joinEventStatic() external payable returns(uint) {
//        // TODO: change it to error
//        require(expenses_m[msg.sender].amount >= msg.value);
//        Participant memory participant = Participant({
//            participant: msg.sender,
//            firstname: "_firstname",
//            lastname: "_lastname",
//            email: "_email",
//            telephone: "_telephone",
//            event_fee: 1000000000000000000,
//            seats: 6,
//            attended: true
//        });
//        participants_a.push(participant);
//
//        participantCount++;
//        return participantCount;
//    }

    modifier onlyParticipants() {
        bool retval = false;
        for (uint i = 0; i < participants_a.length; i++) {
            if (participants_a[i].participant == msg.sender) {
                retval = true;
            }
        }
        require(retval, "Only participants can use this function");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    modifier notOwner() {
        require(msg.sender != owner, "As an owner you can't call this function");
        _;
    }

    function _removeParticipants(uint index) private {
        // Move the last element into the place to delete
        participants_a[index] = participants_a[participants_a.length - 1];
        // Remove the last element
        participants_a.pop();
    }

    function testMappingStructs() external notOwner onlyParticipants returns(bool) {
        require(participant_m[msg.sender].isValue, "There is no value for this address");
        uint index = participant_m[msg.sender].index;
        participants_a[index].firstname = "Mark";
        return true;
    }


}
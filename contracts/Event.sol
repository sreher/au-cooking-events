// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "hardhat/console.sol";

/// @title A contract to manage cooking events
/// @author Sven Reher
/// @notice This contract will handle the registration and expenses of the participants
/// @dev Gas optimatation follows
contract Event {
    address payable public owner;

    // Variables
    string public title;
    string public description;
    uint public eventDate;
    uint public eventDeposit;
    uint public participantCount;
    bool private compensationCalculated;
    EventStatus public eventStatus;
    uint public eventSeats;

    // Constants
    uint constant private DAY_IN_SECONDS = 86400;
    uint constant private HOUR_IN_SECONDS = 3600;
    uint constant private MIN_PARTICIPANTS = 4;
    uint constant private ENDED_TIME_FRAME = 5 * HOUR_IN_SECONDS;
    uint constant private CLOSING_TIME_FRAME = 24 * HOUR_IN_SECONDS;
    uint constant private WITHDRAW_TIME_FRAME = 48 * HOUR_IN_SECONDS;
    uint constant private MAX_AMOUNT_TO_RECAIM = 0.0040 * 1e18;

    // Enums
    enum EventStatus { ACTIVE, DISTRIBUTED, ENDED, CANCELED }
    enum ParticipantsRoles { UNDEFINED, HOST, STARTER, MAINDISH, DESSERT }

    // Custom Errors
    error NoRegistrationFoundForThisUser(address _addr1);
    error UserHasAlreadyJoinedTheEvent(address _addr1);

    // Structs
    struct ParticipantDouble {
        uint index;
        bool isValue;
    }

    struct Participant {
        address participant;
        string firstname;
        string lastname;
        string email;
        string telephone;
        uint event_deposit;
        uint seats;
        bool attended;
        ParticipantsRoles role;
    }

    struct Expense {
        address participant;
        uint amount;
        bool reclaimed;
        bool confirmed;
        uint event_compensation;
        bool withdraw;
    }

    // Data structure
    Participant[] public participants_a;
    Expense[] public expenses_a;
    mapping(address => ParticipantDouble) public participant_m;


    constructor(
        string memory _title,
        string memory _description,
        uint _eventDate,
        uint _eventDeposit
    ) {
        owner = payable(msg.sender);
        title = _title;
        description = _description;
        eventDate = _eventDate;
        eventStatus = EventStatus.ACTIVE;
        eventDeposit = _eventDeposit;
    }

    /// @notice Add the users to the cooking event
    /// @param _firstname Firstname of the participant
    /// @param _lastname Lastname of the participant
    /// @param _email Email of the participant
    /// @param _telephone Phone of the participant
    /// @param _seats Seats in the kitchen of the participant
    function joinEvent (
        string memory _firstname,
        string memory _lastname,
        string memory _email,
        string memory _telephone,
        uint _seats
    ) public payable {
        // User can only register to active events
        require(eventStatus == EventStatus.ACTIVE, "This event isn't active anymore");
        // User can only register to the event before the Closing Time Frame
        require(block.timestamp < (eventDate - CLOSING_TIME_FRAME) , "This event is closed");
        // The User has to pay the exact event deposit
        require(msg.value == eventDeposit, "The correct eventDeposit has to be paid");
        // User can only register once
        if (participant_m[msg.sender].isValue) {
            revert UserHasAlreadyJoinedTheEvent(msg.sender);
        }
        // With the first participant the contract sets the seats, so it make no sense to check the seats for the first user
        if (participants_a.length > 0) {
            // with the first participant will be host and the eventSeats will be set from this user
            require(participants_a.length < eventSeats, "There are no more seats");
        }

        Participant memory participants_s = Participant({
            participant: msg.sender,
            firstname: _firstname,
            lastname: _lastname,
            email: _email,
            telephone: _telephone,
            event_deposit: msg.value,
            seats: _seats,
            attended: true,
            role: ParticipantsRoles.UNDEFINED
        });
        participants_a.push(participants_s);
        participant_m[msg.sender].index = participants_a.length - 1;
        participant_m[msg.sender].isValue = true;

        Expense memory expense_s = Expense({
            participant: msg.sender,
            amount: 0,
            reclaimed: false,
            confirmed: false,
            event_compensation: 0,
            withdraw: false
        });
        expenses_a.push(expense_s);

        // the first participant will be the host, so the seats will be set
        if (participants_a.length == 1) {
            require(_seats >= 4, "The minimum seats are four");
            eventSeats = _seats;
        }

        participantCount++;
    }

    /// @notice Remove a user from an event. The event deposit will be payed back.
    function cancelParticipant() external notOwner onlyParticipants {
        require(eventStatus == EventStatus.ACTIVE, "This event isn't active anymore");
        // require(block.timestamp <= eventDate - CLOSING_TIME_FRAME, "This event is closed");
        // TODO: participants can only cancel before closing time

        // Pay back the Event deposit
        uint removed_index = participant_m[msg.sender].index;
        uint _event_deposit = participants_a[removed_index].event_deposit;
        (bool success, ) = msg.sender.call{value: _event_deposit}("");
        require(success, "send back event deposit transaction failed");

        // The participant leaves the event
        // Move the last user into the position of the replaced user and delete the last position
        Participant memory participant_tobe_swaped = participants_a[participants_a.length - 1];
        participants_a[removed_index] = participant_tobe_swaped;
        // Adapt the changes to the expenses array
        Expense memory expense_tobe_swaped = expenses_a[expenses_a.length - 1];
        expenses_a[removed_index] = expense_tobe_swaped;
        // Update the participant mapping with the index from the replaced user
        participant_m[participant_tobe_swaped.participant].index = removed_index;
        // Remove the last element
        participants_a.pop();
        expenses_a.pop();
        delete participant_m[msg.sender];
        // Reduce participant count
        participantCount--;
    }

    /// @notice The event closed the registration and the roles will be randomly assigned
    function distributeEvent() external onlyOwner {
        require(eventStatus == EventStatus.ACTIVE, "Only active events can be distributed");
        require(participantCount >= MIN_PARTICIPANTS, "The minimum number of participants has not been reached");
        require(block.timestamp >= eventDate - CLOSING_TIME_FRAME && block.timestamp <= eventDate, "You can only distribute 24 hours before the event started");

        // Distribute roles to the participants
        shuffleArray();

        // Set roles to the participants
        // First the host will be set, this is fix
        participants_a[0].role = ParticipantsRoles.HOST;
        // Other Roles will be even distributed over the other Roles
        for(uint i=1; i < participants_a.length; i++) {
            if (i % 3 == 1) {
                participants_a[i].role = ParticipantsRoles.STARTER;
            }
            if (i % 3 == 2) {
                participants_a[i].role = ParticipantsRoles.MAINDISH;
            }
            if (i % 3 == 0) {
                participants_a[i].role = ParticipantsRoles.DESSERT;
            }
        }

        eventStatus = EventStatus.DISTRIBUTED;
    }

    /// @notice Internal function to distribute the roles randomly
    function shuffleArray() internal  {
        uint randNonce = 0;
        uint _randomNumber = uint(keccak256(abi.encodePacked(block.timestamp, msg.sender, randNonce))) % 100;
        // The first participant is the host and fix - start from 1
        for (uint256 i = 1; i < participants_a.length; i++) {
            uint256 n = i + (_randomNumber % (participants_a.length - i));
            if(i != n) {
                Participant memory temp = participants_a[n];
                participants_a[n] = participants_a[i];
                participants_a[i] = temp;
            }
        }
        participants_a = participants_a;
    }

    /// @notice The expenses from the participants will be saved in the event contract, for further use
    function reclaimExpenses(uint amount) external onlyParticipants {
        require(eventStatus == EventStatus.DISTRIBUTED || eventStatus == EventStatus.ENDED, "Expenses can only be entered for distributed or ended events");
        require(block.timestamp >= eventDate && block.timestamp <= eventDate + WITHDRAW_TIME_FRAME, "You can only enter your expenses after the event started and within the withdraw time");
        require(amount >= 0 && amount <= MAX_AMOUNT_TO_RECAIM, "It has to be more than 0 EUR and less than 0.0040 Ether");

        uint index = participant_m[msg.sender].index;
        expenses_a[index].amount = amount;
        expenses_a[index].reclaimed = true;

        setEventStatusEnded();
    }

//    /// @notice prepare the function to show the expenses for the frontend
//    function showExpenses() public view onlyParticipants returns(Expense[] memory) {
//        require(eventStatus == EventStatus.DISTRIBUTED || eventStatus == EventStatus.ENDED, "Expenses can only be entered for distributed or ended events");
//         require(block.timestamp >= eventDate && block.timestamp <= eventDate + WITHDRAW_TIME_FRAME, "You can only enter your expenses after the event started and within the withdraw time");
//
//        return expenses_a;
//    }

//    /// @notice prepare the function to show the expenses for the frontend
//    function showParticipants() public view onlyParticipants returns(Participant[] memory) {
//        //require(eventStatus == EventStatus.DISTRIBUTED || eventStatus == EventStatus.ENDED, "Expenses can only be entered for distributed or ended events");
//        // require(block.timestamp >= eventDate && block.timestamp <= eventDate + WITHDRAW_TIME_FRAME, "You can only enter your expenses after the event started and within the withdraw time");
//
//        return participants_a;
//    }

    /// @notice Users can confirm each other so that the contract knows who didn't show up
    function confirmParticipation(address _addr1) external onlyParticipants {
        require(eventStatus == EventStatus.DISTRIBUTED || eventStatus == EventStatus.ENDED, "This event has to be distributed or ended");
        require(block.timestamp >= eventDate && block.timestamp <= eventDate + WITHDRAW_TIME_FRAME, "You can only confirm others after the event started and within the withdraw time");
        require(msg.sender != _addr1, "Another user has to confirm you!");

        // Set Participation of the participant to CONFIRMED
        if (participant_m[_addr1].isValue) {
            uint index = participant_m[_addr1].index;
            expenses_a[index].confirmed = true;
        } else {
            revert NoRegistrationFoundForThisUser(_addr1);
        }

        setEventStatusEnded();
    }

    /// @notice Internal function to calc the event compensation
    function calcEventCompensation() internal onlyParticipants {
        // When all confirmed and reclaim their expenses or time over
        uint allEventDeposit = 0;
        uint allExpenses = 0;
        uint penalty = 0;
        uint eventCompensation = 0;
        uint confirmedParticipation;
        // Collect all informations to calculate the compensation
        for (uint i=0; i < expenses_a.length; i++) {
            allEventDeposit += participants_a[i].event_deposit;
            allExpenses += expenses_a[i].amount;
            confirmedParticipation += expenses_a[i].confirmed ? 1 : 0;
        }

        require(confirmedParticipation > 0, "There are no confirmed participants in the event");
        // Distributing the event deposits of non-participants
        if (participantCount != confirmedParticipation) {
            penalty = (participantCount - confirmedParticipation) * eventDeposit / confirmedParticipation;
        }
        uint costPerParticipant = allExpenses / confirmedParticipation;

        // calculation the even compensation
        for (uint i = 0; i < expenses_a.length; i++) {
            if (expenses_a[i].confirmed) {
                // event_compensation will be only calculated for attending users
                uint getBack = (participants_a[i].event_deposit + expenses_a[i].amount + penalty);
                // TODO: handle the issue, if the cost higher than the deposit - spread the costs evenly?
                eventCompensation = getBack - costPerParticipant;
                expenses_a[i].event_compensation = eventCompensation;
            } else {
                // no event compensation for  for non-participating users
                expenses_a[i].event_compensation = 0;
            }
        }
    }

    /// @notice Payout the event compensation
    function withdraw() external onlyParticipants returns(bool) {
        require(eventStatus == EventStatus.DISTRIBUTED || eventStatus == EventStatus.ENDED, "Expenses can only be entered for distributed or ended events");
        require(block.timestamp >= eventDate + ENDED_TIME_FRAME && block.timestamp <= eventDate + WITHDRAW_TIME_FRAME, "You can only withdraw your ether when the event has ended and within the withdraw time frame");
        uint _index = participant_m[msg.sender].index;
        require(!expenses_a[_index].withdraw, "The deposit can only once withdraw");

        if (!compensationCalculated) {
            // Only run once, to calculate the event compensation
            calcEventCompensation();
            compensationCalculated = true;
        }

        // Send the compensation to the msg.sender
        uint _event_compensation = expenses_a[_index].event_compensation;
        (bool success, ) = msg.sender.call{value: _event_compensation}("");
        require(success, "send back event compensation - transaction failed");
        expenses_a[_index].withdraw = true;

        setEventStatusEnded();
        return true;
    }

    /************************  Utility functions  ************************************************/

    /// @notice Set the Event Status to ENDED
    function setEventStatusEnded() internal {
        require(eventStatus == EventStatus.DISTRIBUTED || eventStatus == EventStatus.ENDED, "The event has been distributed and is not in finished status.");
        // Set the event to Ended, when a function call happens later than the Ended Time
        if (block.timestamp >= eventDate + ENDED_TIME_FRAME && eventStatus != EventStatus.ENDED) {
            eventStatus = EventStatus.ENDED;
        }
    }

    /// @notice Returns the confirmation status of the user
    function isConfirmed() external view returns (bool) {
        uint index = participant_m[msg.sender].index;
        return expenses_a[index].confirmed;
    }

    /// @notice Returns the expenses of the user
    function getUserExpenses() external view returns (uint, bool) {
        uint index = participant_m[msg.sender].index;
        return (expenses_a[index].amount, expenses_a[index].reclaimed);
    }

    /// @notice Return if the user withdraw their deposit
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

    function getEventClosingTime() external view returns (uint) {
        return (eventDate - CLOSING_TIME_FRAME);
    }

    function setEventStatus(EventStatus _eventStatus) public onlyOwner {
        // TODO: prevent "value out-of-bounds" errors
        eventStatus = _eventStatus;
    }

    /************************  modifier functions  ************************************************/

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
}
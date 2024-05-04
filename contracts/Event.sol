// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "hardhat/console.sol";

contract Event {
    address payable public owner;
    address public testSender;
    uint public testValue;

    // Variables
    string public title;
    string public description;
    // convert from js to timestamp
    uint public eventDate;
    uint public eventFee;
    uint public participantCount;
    EventStatus public eventStatus;

    // TODO: remove when kitchen feature is implemented
    uint public eventSeats;
    address [] public kitchenList;

    // Constants
    uint constant dayInSeconds = 86400;
    uint constant hourInSeconds = 3600;

    // Events
    event Received(address, uint);

    enum EventStatus { ACTIVE, DISTRIBUTED, ENDED, CANCELED }
    uint constant enumLength = 4;

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
        bool confirmed;
        bool paided;
    }
    Expense[] public expenses_a;

    // Data structure
    mapping(address => Participant) public participant_m;
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

    function setTitle (string memory _title) public {
        title = _title;
    }

    function joinEvent (
        string memory _firstname,
        string memory _lastname,
        string memory _email,
        string memory _telephone,
        uint _seats
    ) public payable returns(bool) {
        // TODO: change it to error
        require(msg.value == eventFee, "the correct eventFee has to be paid");
        require(!userJoined(msg.sender), "the user have already joined the event");
        require(eventStatus == EventStatus.ACTIVE, "this event isn't active anymore");

        // TODO: remove this later when the kitchen feature is implemented
        if (participants_a.length > 0) {
            // with the first participant the eventSeats will be set
            require(participants_a.length < eventSeats, "there are no more seats");
        }

        // one hour/day before the event the registration will be closed
        require(block.timestamp < (eventDate - (1 * hourInSeconds)) , "this event is closed");

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
        participant_m[msg.sender] = participants_s;

        //TODO: for test purpose
        testSender = msg.sender;
        testValue = msg.value;

//        Expense memory expense_s = Expense(
//            msg.sender,
//            msg.value,
//            false,
//            true
//        );
//        expenses_a.push(expense_s);
//        expenses_m[msg.sender] = expense_s;

        // the first participant will be the host
        if (participants_a.length == 1) {
            //require(_seats > 4, "The minimum seats are four");
            // TODO: Change this after testing
            require(_seats > 1, "The minimum seats are four");
            eventSeats = _seats;
        }

        participantCount++;
        return true;
    }

    function testMappingStructs() external onlyParticipants notOwner returns(bool) {
        participant_m[msg.sender].firstname = "Mark";
    }

    function cancelEvent() external onlyParticipants notOwner returns(bool) {
        require(eventStatus == EventStatus.ACTIVE, "this event isn't active anymore");
        // Pay back the Event fee
        uint _event_fee = participant_m[msg.sender].event_fee;
        console.log("Contract:::: _event_fee: ", _event_fee);
        (bool success, ) = msg.sender.call{value: _event_fee}("");
        require(success, "send back event fee transaction failed");

        console.log("Contract:::: _event_fee was sended");
        // The participant leaves the event
        participant_m[msg.sender].attended = false;
        // The event fee was paid back
        participant_m[msg.sender].event_fee = 0;
        // Remove participant from participants list
        delete participant_m[msg.sender];
        // Reduce participant count
        participantCount--;

        // OR

        // The Date/Time of the event is more than 24 hours away OR Event Status == ENDED OR Event Status == DISTRIBUTED
        // Relocated the Event Fee of the participant to Compensation Pool

        return true;
    }

//    function _print_array(uint256[] array) external view returns(bool) {
//        for(let i=0; < array.length; i++) {
//            console.log(array[i]);
//        }
//        return expenses_m[_addr1].amount;
//    }


    function balanceOf(address _addr1) external view returns(uint256) {
        // console.log("balanceOf - ", expenses_m[_addr1]);
        return expenses_m[_addr1].amount;
    }

    function userJoined(address _addr1) public view returns(bool) {
        return participant_m[_addr1].participant != address(0);
    }

    function userJoined_a(address _addr1) external view returns(address) {
        return participant_m[_addr1].participant;
    }

    function getParticipants() external view returns (Participant[] memory) {
        return participants_a;
    }

    function getParticipants_m() external view returns (string memory) {
        return participant_m[msg.sender].firstname;
    }

    function getExpenses() external view returns (Expense[] memory) {
        return expenses_a;
    }

    function getBlockTime() external view returns (uint) {
        return block.timestamp;
    }

    function getEventClosingTime() external view returns (uint) {
        return (eventDate - (1 * hourInSeconds));
    }

    function getEventStatus() public view returns(EventStatus) {
        return eventStatus;
    }

    function getEventSeats() public view returns(uint) {
        return eventSeats;
    }

    function setEventStatus(EventStatus _eventStatus) public onlyOwner {
        // TODO: prevent "value out-of-bounds" errors
        // require(_eventStatus > EventStatus.ACTIVE);
        // require(_eventStatus < EventStatus.ENDED);
        eventStatus = _eventStatus;
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
        console.log("receive function was called", msg.value);
    }

    function destroyEvent() public onlyOwner {
        selfdestruct(owner);
    }


    /************************  Test Function  ************************************************/

    function getMsgSender() public {
        testSender = msg.sender;
    }

    function getMsgValue() public payable {
        testValue = msg.value;
    }

    // TODO: remove it
    function joinEventStatic() external payable returns(uint) {
        // TODO: change it to error
        require(expenses_m[msg.sender].amount >= msg.value);
        Participant memory participant = Participant({
            participant: msg.sender,
            firstname: "_firstname",
            lastname: "_lastname",
            email: "_email",
            telephone: "_telephone",
            event_fee: 1000000000000000000,
            seats: 6,
            attended: true
        });
        participants_a.push(participant);

        participantCount++;
        return participantCount;
    }

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
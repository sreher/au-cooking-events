# Cooking Events

## Short Summary
A Delivery versus Payment (DVP) contract built for the Ethereum blockchain that facilitates over the counter(OTC) settlements between two parties.

## Szenario
this project is about handling community cooking events onchain.  
imagine you will enjoy a cooking event in your town with interesting people. 
To realise this register to a cooking event, and you only know that there are people invited from a friend of you, who send you a link to this event.   
you will cook together a three-course menu for an evening and get to know each other  
before the event has started, you don't see who is participating, you don't see what will be the meal, you don't see where the event will happen  
But you are curious and register and wait for the event.  
24 hours before the event starts you can see on the event which role you have and where the event will happen.  
The roles in an event: 
There is one host with a kitchen, there the event will happen    
There are different other roles corresponds to the meals - starter, main dish and dessert
These roles have to choose a recipe, buy the ingredient and take that to the evening.
All the participants will meet in the kitchen of the host and start preparing the meals, drinking some wine and have a good time. 
48 hours after the event starts, the participants can withdraw their event deposit - minus the cost of the event.
In the end it will be a nice experience for all. 


## Use Cases
* create an event 
* The owner can cancel the event until it has not started
* people can register until 24 hours event starts and free seats are available, minimum are 4 seats
* people deposit money to participate and pay for the ingredience of the meals 
* people can unregister until 24 hours before the event without losing their event fee 
* 24 hours before the event, the registation will be closed and more details about the event will be displayed to the participants
* when the event starts, the participants can do two things: confirmed other people and reclaim their expensed for the event
* the event will end 5 hours after the event start
* when the withdraw time is over, a event compensation will be calculated and the participant can payout their money
* when a participant will not appear to the event and hasn't unregister, the event fee will be distributed to the other participants, so they pay less
* the period until 48 hours after the event starts, the participants can confirmed and reclaim their expenses

## Gettings started

This project has no frontend yet. The fokus was on the testing part.
Every aspect of the contract should be tested in different variations to ensure, that the contract is working as expected.

Try running some of the following tasks:

```shell
npm install
npm test
```

So these are the main test section:

* Basic event tests  
  ✔ should deploy and set the owner correctly (679ms)  
  ✔ should be tested that the title and the description exists and be correct  
  ✔ test letParticipantsJoinsTheEvent (66ms)  
  ✔ should be tested, that a user can only entered once (49ms)  
  ✔ shoud be tested that event status changes correctly  
  ✔ should be tested that events closed correctly
* Joining an event  
  ✔ should be tested that participants can join the events (68ms)  
  ✔ should be tested that the event seats restrictions works (54ms)  
  ✔ should be checked that the minimum event seats is right  
  ✔ should prevent to enter the event without the incorrect event fee
* Distributing event tests  
  ✔ should revert with message: The minimum number of participants has not been reached (40ms)  
  ✔ should revert with message: Only the owner can call this function (44ms)  
  ✔ should revert with message: Only active events can be distributed (57ms)  
  ✔ should revert with message: You can only distribute 24 hours before the event started - before eventClosingTime (48ms)  
  ✔ should revert with message: You can only distribute 24 hours before the event started - at eventClosingTime (48ms)  
  ✔ should revert with message: You can only distribute 24 hours before the event started - at eventTime (46ms)
* Reclaiming event tests  
  ✔ should be checked that the reclaim expenses works (169ms)
* Handling expenses event tests  
  ✔ should be checked that the expenses entered correctly (91ms)
* Handling event compensation tests  
  ✔ should be checked that the event compensation (withdraw) is calculated correctly (505ms)
* Handling event comfirmation tests  
  ✔ should be checked that the participation is correctly confirmed (101ms)  
  ✔ should be checked that the event status works correctly with the participation confirmation (89ms)
* Handling event canelation tests  
  ✔ should be tested that the event cancelation works (80ms)  
  ✔ should be tested that the cancelation of a participant works  

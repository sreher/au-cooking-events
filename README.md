# Cooking Events

## Short Summary
A Event Management System for Cooking Events built on the Ethereum blockchain that makes it very easy to organise a nice evening together with friends. 

## A 3-course barbecue menu near your home

Welcome to the innovative world of onchain community cooking events! Our project aims to revolutionize the way people come together to cook, socialize, and enjoy delicious meals.

Envision yourself into a cooking event in your town, surrounded by intriguing individuals, all ready to embark on a culinary adventure. To join, you simply register for the event through a link shared by a friend. But here's the twist: until the event begins, participants remain in suspense. You won't know who else is attending, what's on the menu, or even where the event will take place. It's an exhilarating mystery that piques your curiosity and anticipation.

Then, 24 hours before the event commences, the veil is lifted. You discover your role for the evening and the location of the event. Roles vary from the gracious host, who opens their kitchen for the gathering, to contributors responsible for crafting delightfully courses such as starters, main dishes, and desserts. Each role involves selecting recipes, supplying ingredients, and bringing them to the event.

As the appointed time arrives, participants converge in the host's kitchen, ready to collaborate, create, and connect. Amidst chopping, frying, and simmering, conversations flow, wine is enjoyed, and bonds are formed. It's not just about cooking; it's about the joy of shared experiences and communal moments.

Following the event, participants can withdraw their event deposit, minus an event compensation. This ensures accountability and transparency, reinforcing trust within the community.

Ultimately, our project promises to deliver unforgettable experiences, where strangers become friends, and meals become memories. Join us as we blend the excitement of onchain technology with the warmth of communal cooking, creating an enriching journey for all involved.


## Technical use cases of the contract
* create an event 
* people can register until 24 hours event starts and free seats are available, minimum are 4 seats
* people deposit money to participate and pay for the ingredience of the meals 
* people can unregister until 24 hours before the event without losing their event deposit 
* 24 hours before the event, the registation will be closed and more details about the event will be displayed to the participants
* when the event starts, the participants can do two things: confirmed other people and reclaim their expensed for the event
* the event will end 5 hours after the event start
* when the withdraw time is over, a event compensation will be calculated and the participant can payout their money
* when a participant will not appear to the event and hasn't unregister, the event deposit will be distributed to the other participants, so they pay less
* the period until 48 hours after the event starts, the participants can confirmed and reclaim their expenses

## Gettings started

This project has no frontend yet. The fokus was on the testing part. There is a more descriptive test suite with a scenario and the complete test suite with all tests.
Every aspect of the contract should be tested in different variations to ensure, that the contract is working as expected.

Try running some of the following tasks:

```shell
npm install
npm run scenario
npm test
```

The command "npm run scenario" runs a descriptive test suite to walk through the complete process:

```
EventScenario
    3-course barbecue menu near the city park
      ✔ six user register to the event
      ✔ one user leaves the event
      ✔ the event will be clossed and distributed
      ✔ the participants can confirm among each other
      ✔ the participants enter their expenses for the evening
      ✔ the event is over. participants can widthdraw their deposit  minus the event compensation
```

The command "npm test" runs the complete test suite with all test cases.

```
  Functional event tests
    Basic event tests
      ✔ should deploy and set the owner correctly
      ✔ should be tested that the title and the description exists and be correct
      ✔ test letParticipantsJoinsTheEvent
      ✔ should be tested, that a user can only entered once
      ✔ shoud be tested that event status changes correctly
      ✔ should be tested that events closed correctly
    Joining an event
      ✔ should be tested that participants can join the events
      ✔ should be tested that the event seats restrictions works
      ✔ should be checked that the minimum event seats is right
      ✔ should prevent to enter the event without the incorrect event deposit
    Distributing event tests
      ✔ should revert with message: The minimum number of participants has not been reached
      ✔ should revert with message: Only the owner can call this function
      ✔ should revert with message: Only active events can be distributed
      ✔ should revert with message: You can only distribute 24 hours before the event started - before eventClosingTime
      ✔ should revert with message: You can only distribute 24 hours before the event started - at eventClosingTime
      ✔ should revert with message: You can only distribute 24 hours before the event started - at eventTime
    Reclaiming event tests
      ✔ should be checked that the reclaim expenses works
    Handling expenses event tests
      ✔ should be checked that the expenses entered correctly
    Handling event compensation tests
      ✔ should be checked that the event compensation (withdraw) is calculated correctly
    Handling event comfirmation tests
      ✔ should be checked that the participation is correctly confirmed
      ✔ should be checked that the event status works correctly with the participation confirmation
```
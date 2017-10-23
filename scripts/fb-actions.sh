#!/bin/bash

# PAGE_ACCESS_TOKEN=`node /home/ec2-user/scripts/crypto.js --pat | grep -v Logger`;
PAGE_ACCESS_TOKEN=`node /home/ec2-user/scripts/crypto.js --apat | grep -v Logger`;
SFO_PAGE_ACCESS_TOKEN=`node /home/ec2-user/scripts/crypto.js --travel_sfo | grep -v Logger`;
SEA_SPRAY_PAGE_ACCESS_TOKEN=`node /home/ec2-user/scripts/crypto.js --sea_spray | grep -v Logger`;

# Whitelist domain
function whitelist_domain {
  echo "whitelist function called";
  curl -X POST -H "Content-Type: application/json" -d '{
    "setting_type" : "domain_whitelisting",
    "whitelisted_domains" : ["https://polaama.com"],
    "domain_action_type": "add"
  }' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=$PAGE_ACCESS_TOKEN"
}

function subscribe_app {
  curl -X POST "https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=$PAGE_ACCESS_TOKEN"
}

function send_message {
  id="$1"
  message="$2"
  echo "id is $id; message is <$message>"
  curl -v POST -H "Content-Type: application/json" -d '{
    "recipient":{
      "id":'$id'
    },
    "message":{
      "text":"$message"
    }
  }' "https://graph.facebook.com/v2.6/me/messages?access_token=$PAGE_ACCESS_TOKEN"
}

function set_persistent_menu {
  curl -X POST -H "Content-Type: application/json" -d '{
    "persistent_menu": [{
      "locale": "default",
      "call_to_actions":[
        {
          "type":"postback",
          "title":"Create New Trip", 
          "payload":"pmenu_new_trip"
        },
        {
          "type":"postback",
          "title":"Existing trips", 
          "payload":"pmenu_existing_trips"
        },
        {
          "type":"postback",
          "title":"Help", 
          "payload":"pmenu_help"
        }
      ]
    }]
  }' "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=$PAGE_ACCESS_TOKEN"    
}

function set_persistent_menu_sfo_travel {
  curl -X POST -H "Content-Type: application/json" -d '{
    "persistent_menu": [{
      "locale": "default",
      "call_to_actions":[
        {
          "type":"postback",
          "title":"Cancel existing reservation",
          "payload":"pmenu_travel_sfo_existing_reservation"
        },
        {
          "type":"postback",
          "title":"Call us",
          "payload":"pmenu_travel_sfo_call_us"
        },
        {
          "type":"postback",
          "title":"Customer service details",
          "payload":"pmenu_travel_sfo_customer_service"
        }
      ]
    }]
  }' "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=$SFO_PAGE_ACCESS_TOKEN"    
}

function set_get_started_menu_sfo {
  curl -X POST -H "Content-Type: application/json" -d '{
    "get_started": {
      "payload": "GET_STARTED_PAYLOAD"
    }
  }' "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=$SFO_PAGE_ACCESS_TOKEN"    
}

function set_greeting_sfo {
  curl -X POST -H "Content-Type: application/json" -d '{
    "greeting": [{
      "locale": "default",
      "text": "Hello {{user_first_name}}! Welcome to Travel SFO. How can I help you today?",
    }]
  }' "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=$SFO_PAGE_ACCESS_TOKEN"    
}

function delete_greeting_sfo {
  curl -X DELETE -H "Content-Type: application/json" -d '{
    "fields": [ "greeting" ]
  }' "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=$SFO_PAGE_ACCESS_TOKEN"    
}

function set_persistent_menu_sea_spray_travel {
  curl -X POST -H "Content-Type: application/json" -d '{
    "persistent_menu": [{
      "locale": "default",
      "call_to_actions":[
        {
          "type":"postback",
          "title":"Contact us",
          "payload":"sea_spray_contact"
        },
        {
          "type":"postback",
          "title":"Book tours",
          "payload":"sea_spray_book_tour"
        }
      ]
    }]
  }' "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=$SEA_SPRAY_PAGE_ACCESS_TOKEN"    
}

function set_get_started_menu_sea_spray {
  curl -X POST -H "Content-Type: application/json" -d '{
    "get_started": {
      "payload": "GET_STARTED_PAYLOAD"
    }
  }' "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=$SEA_SPRAY_PAGE_ACCESS_TOKEN"    
}

function set_greeting_sea_spray {
  curl -X POST -H "Content-Type: application/json" -d '{
    "greeting": [{
      "locale": "default",
      "text": "Hello {{user_first_name}}! Welcome to SEA SPRAY Cruises, St. Lucia. How can I help you today?",
    }]
  }' "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=$SEA_SPRAY_PAGE_ACCESS_TOKEN"    
}


function set_get_started_menu {
  curl -X POST -H "Content-Type: application/json" -d '{
    "get_started": {
      "payload": "GET_STARTED_PAYLOAD"
    }
  }' "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=$PAGE_ACCESS_TOKEN"    
}

while [[ $# -ge 1 ]]
do
key="$1"

case $key in
  -w|--whitelist)
    shift # past argument
    whitelist_domain
    ;;
  -s|--subscribe-app)
    shift # past argument
    subscribe_app
    ;;
  -sm|--send-message)
    send_message "$2" "$3"
    shift # past argument
    ;;
  -p|--pmenu)
    set_persistent_menu
    shift # past argument
    ;;
  -p_sfo)
    set_persistent_menu_sfo_travel
    shift # past argument
    ;;
  -g_sfo)
    set_get_started_menu_sfo
    shift # past argument
    ;;
  -gr_sfo)
    set_greeting_sfo
    shift # past argument
    ;;
  -d_gr_sfo)
    delete_greeting_sfo
    shift # past argument
    ;;
  -p_sea_spray)
    set_persistent_menu_sea_spray_travel
    shift # past argument
    ;;
  -g_sea_spray)
    set_get_started_menu_sea_spray
    shift # past argument
    ;;
  -g|--get-started)
    set_get_started_menu
    shift # past argument
    ;;
esac
done
echo ""

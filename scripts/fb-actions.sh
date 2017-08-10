#!/bin/bash

PAGE_ACCESS_TOKEN=`node /home/ec2-user/scripts/crypto.js --pat | grep -v Logger`;

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
  -g|--get-started)
    set_get_started_menu
    shift # past argument
    ;;
esac
done
echo ""

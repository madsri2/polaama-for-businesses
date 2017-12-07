curl -X PUT \
'https://api.dialogflow.com/v1/intents/37617356-9c7e-48be-891c-bc7d8eaad2c9?v=20150910' \
-H 'Authorization: Bearer 56ef935d1a6c43088b164e37d394d39e' \
-H 'Content-Type: application/json' \
--data '{
  "name": "Greeting",
  "userSays": [
    {
      "data": [
        {
          "text": "Hello there. How are you?"
        }
      ]
    }
  ]
}'

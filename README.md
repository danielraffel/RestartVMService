# RestartVMService

Designed to be used with gCloud Ghost Updater to restart a Google Cloud VM when a ping service notices the (Ghost Blog) VM is not available

Assumes you are using Freshping to monitor your website - free signup here: https://www.freshworks.com/website-monitoring/pingdom-alternative/
And, setup a webhook integration with Freshping to notify your Google Cloud Run trigger URL when your site is up/down with custom content payload: "secret": "UNIQUE_PASSWORD"

When you setup your Google Cloud run function name it: RestartVMService
And, create a Runtime environment variable: secret | UNIQUE_PASSWORD
Update index.js with the content in this repo and add YOUR_PROJECT_ID and EXTERNAL_STATIC_IP
Update package.js with the content in this repo
Note: logging the body of the functions is enabled by default for debugging

To test it with curl update this with your UNIQUE_PASSWORD, YOUR-ZONE and YOUR-PROJECT-ID-NUMBER
curl -X POST -H "x-custom-secret: UNIQUE_PASSWORD" https://YOUR-ZONE-YOUR-PROJECT-ID-NUMBER.cloudfunctions.net/RestartVMService

for example: curl -X POST -H "x-custom-secret: badpassword123" https://us-west1-ghost-blog-23221.cloudfunctions.net/RestartVMService
Note your trigger URL in this example is: https://us-west1-ghost-blog-23221.cloudfunctions.net/RestartVMService

What the function does when triggered:

1. Secret Validation: The code starts by checking if a secret key sent in the request headers or body matches a predefined secret.

2. Error State Check: It also checks if the incoming request's response_state is "Reporting Error". If either the secret is incorrect or the state is not "Reporting Error", it stops execution and responds with "Forbidden or Not Reporting Error".

3. Google Cloud Authentication: If the checks pass, the code proceeds to authenticate with Google Cloud.

4. Zone and Instance Lookup: The script fetches all zones in the project and looks for the specific Google Cloud instance that matches a given IP address.

5. Instance Selection: Among the instances that match the IP, it selects the one with the highest number in its name.

6. Status Check and Restart/Start: After finding the target instance, it checks its current status. If it's running, it resets (restarts) it. If it's stopped or terminated, it starts it.

7. Response: Finally, it sends a response back, indicating whether the operation was successful or not.

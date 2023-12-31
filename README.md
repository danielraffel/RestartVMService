# RestartVMService

This [Google Cloud Run](https://console.cloud.google.com/run) function is designed to be used with [gCloud-Ghost-Updater](https://github.com/danielraffel/gCloud-Ghost-Updater) to restart a Google Cloud VM when [httpPing](https://github.com/danielraffel/httpPing) notices the (Ghost Blog) VM is not available.

## Assumptions

* You are using the Google Cloud Function [httpPing](https://github.com/danielraffel/httpPing) to monitor your website.
* [httpPing](https://github.com/danielraffel/httpPing) will notify your Google Cloud Run trigger URL when your site is up/down and has a key-value pair: "secret": "UNIQUE_PASSWORD"
* NOTE: This is definitely not for use with anything highly sensitive unless you take additional security measures

## Grant Your Service Account Cloud Function Execution Privs
1. **Find Service Account**: In the IAM section of the console locate the App Engine default service account, usually named `property-ID-number@appspot.gserviceaccount.com`.
2. **Edit**: Click the pencil icon next to the service account.
3. **Add Role**: Scroll and hit "Add Another Role."
4. **Choose Role**: In the dropdown, go to "Compute Engine" and pick "Compute Instance Admin (v1)." This role allows the service account to manage Compute Engine instances across the Google Cloud project.
5. **Add 2nd Role:** Click on “Add Another Role”.
6. **Choose Role:** In the dropdown menu, select the “Cloud Functions” category and then choose the “Cloud Functions Invoker” role. This role allows the service account to invoke Cloud Functions.
7. **Save**: Scroll down, click "Save."
8. Run

## Setup

1. Create a Google Cloud Run v2 function named `RestartVMService` set Authentication to use `HTTPS` and `Allow unauthenticated invocations`.
2. Create a Runtime environment variable named `secret` and set its value to the UNIQUE_PASSWORD that you configured in httpping payload.
3. Update the `index.js` file with the content in this repository. Make sure to update the `YOUR_PROJECT_ID` and `EXTERNAL_STATIC_IP` variables with your own values.
4. Update the `package.js` file with the content in this repository.

## Testing

To test the function, you can use the following curl command format:

```
curl -X POST -H "x-custom-secret: UNIQUE_PASSWORD" https://YOUR_ZONE-YOUR_PROJECT_ID-NUMBER.cloudfunctions.net/RestartVMService
```


For example if you customized it with your details it might look like:

```
curl -X POST -H "x-custom-secret: UNIQUE_PASSWORD" https://us-west1-ghost-blog-23221.cloudfunctions.net/RestartVMService
```

## How it works

When the function is triggered, it performs the following steps:

1. Validates the secret.
2. Checks the error state.
3. Authenticates with Google Cloud.
4. Queries all zones in the project.
5. Finds the Google Cloud instance that matches the given IP address.
6. Selects the instance with the highest number in its name.
7. Checks the status of the instance.
8. Restarts or starts the instance, depending on its current status.
9. Sends a response indicating whether the operation was successful or not.

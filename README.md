# ReDriveApp

*This is not an officially supported Google product.*

## Summary
ReDriveApp (short for "Recommended" or "Replacement" DriveApp)

Sample code that provides equivalent methods offered by the built-in DriveApp, but that does not require use of full '/drive' OAuth scope (which is a "Restricted" scope"). Instead, uses only these Recommended (non-sensitive) and/or Sensitive scopes:
<ul>
  <li>/auth/drive.file (Recommended / Non-Sensitive)</li>
  <li>/auth/userinfo.email (Non-Sensitive)</li>
  <li>/auth/script.external_request (Sensitive)</li>
</ul>

## Uses
ReDriveApp is intended as a (mostly) drop-in replacement for projects that wish to migrate away from DriveApp, as the latter automatically forces use of the full /auth/drive scope in Apps Script projects, which is a Restricted scope. Restricted Drive scopes can raise concerns from users and admins based on the extensive level of access they request. They also require additional reviews from Google and/or 3rd-party security auditors if you wish to publish your Apps Script project as a publicly available app (Add-on, Chat App, etc). In many cases though, projects don't really need the full Drive scope for common tasks, and the Recommended /auth/drive.file scope is sufficient.

## Requirements and Limitations
<ol>
<li> Requires use of Apps Script Advanced Services (Drive) defined with identifier 'Drive' in your Apps Script manifest file. </li>

<li>Only Drive v2 has been tested and fully implemented at the moment. Note though that while many of the most commonly used DriveApp methods have been implemented, some have not been written yet. Contributions are welcome to add those.</li>

<li>Code is in-place to support Drive v3 in the future, and v3 handling has been implemented for some methods. However v3 support is not yet complete, and has yet to be tested as integration of Drive v3 API was only recently added to the Apps Script Advanced Drive Service.</li>

<li>If your project previously opened files using the full Drive scope (i.e. using DriveApp) that it did not create itself, it will not be able to access those same files simply by replacing occurrences of DriveApp with ReDriveApp. That is because those files were not accessed with the /auth/drive.file scope previously, and so are not already marked in Drive as accessible by your project. Users of your script or app will need to re-select said files that they wish to access via the Drive Picker. If they do not, you will get a "File not Found" error from Drive when trying to access those files by their Drive file ID.</li>
<ol>


## Use 
Create a new file in your Apps Script project and paste the contents of ReDriveApp.gs found in this repository.

Before using it, set which Drive API version you are using like so:
```
ReDriveApp.setApiVersion(2); // v3 support coming, but not yet fully implemented
```

Next, replace all occurrences of "DriveApp" wih your code with "ReDriveApp". For example, replace this code:

```
let file = DriveApp.createFile('myFile.pdf', 'Some content', MimeType.PDF);
console.log('new file created: ' + file.getName());
```

with this code:
```
let file = ReDriveApp.createFile('myFile.pdf', 'Some content', MimeType.PDF);
console.log('new file created: ' + file.getName());
```

Note that the only thing that changes was the addition of "Re" infront of "DriveApp".

Note that no other changes are necessary as methods for ReDriveApp and its corresponding Objects returned (files, folders, etc) have been implemented as to match the names and signatures of the native DriveApp methods. Similarly, Apps Script native enums such as "MimeType" can be used as-is.



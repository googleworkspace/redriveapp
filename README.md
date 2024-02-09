# ReDriveApp

*This is not an officially supported Google product.*

## Summary
ReDriveApp (short for "Recommended" or "Replacement" DriveApp)

Apps Script class that provides equivalent methods offered by the built-in DriveApp, but that does not require use of full '/drive' OAuth scope (which is a "Restricted" scope"). Instead, uses only these Recommended (non-sensitive) and/or Sensitive scopes:
<ul>
  <li>/auth/drive.file (Recommended / Non-Sensitive)</li>
  <li>/auth/userinfo.email (Non-Sensitive)</li>
  <li>/auth/script.external_request (Sensitive)</li>
</ul>

## Uses
ReDriveApp is intended as a (mostly) drop-in replacement for projects that wish to migrate away from DriveApp, as the latter automatically forces use of the full /auth/drive scope in Apps Script projects, which is a Restricted scope. Restricted Drive scopes can raise concerns from users and admins based on the extensive level of access they request. They also require additional reviews from Google and/or 3rd-party security auditors if you wish to publish your Apps Script project as a publicly available app (Add-on, Chat App, etc). In many cases though, projects don't really need the full Drive scope for common tasks, and the Recommended /auth/drive.file scope is sufficient.

## Requirements and Important Limitations
<ol>
<li> Requires use of Apps Script Advanced Services (Drive) defined with identifier 'Drive' in your Apps Script manifest file. </li>

<li>Only Drive v2 has been tested at the moment, and is the default version used. Note though that while many of the most commonly used DriveApp methods have been implemented, some have not been written yet. Contributions are welcome to add those.</li>

<li>Code is in-place to support Drive v3 in the future, and v3 handling has been implemented for some methods. However v3 support is not yet complete, and has yet to be tested as integration of Drive v3 API was only recently added to the Apps Script Advanced Drive Service (December 2024).</li>

<li>If your project previously opened files using the full Drive scope (i.e. using DriveApp) that it did not create itself, it will not be able to access those same files simply by replacing occurrences of DriveApp with ReDriveApp. That is because those files were not accessed with the /auth/drive.file scope previously, and so are not already marked in Drive as accessible by your project. Users of your script or app will need to re-select said files that they wish to access via the Drive Picker. If they do not, you will get a "File not Found" error from Drive when trying to access those files by their Drive file ID.</li>
</ol>


## Use 
Create a new file in your Apps Script project and paste the contents of ReDriveApp.gs found in this repository.

By default, ReDriveApp will use v2 of the Drive API. Note that v3 has not yet been tested. But if you wish to try using v3, then before using it make a call like this:
```
ReDriveApp.setDriveApiVersion(3, true); // the 'true' makes this sticky, which means you only need to make this call once per Document this script is attached to.
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

See the <code>test.gs</code> file for more examples of how ReDriveApp can be used.

## Known Issues and Differences
ReDriveApp is a "mostly" drop-in replacement for DriveApp, but there are known issues and differences when switching from DriveApp to ReDriveApp. Those are outlined below, with more surely to be added over time as they are discovered:
<ol>
<li>If your project previously opened files using the full Drive scope (i.e. using DriveApp) that it did not create itself, it will not be able to access those same files simply by replacing occurrences of DriveApp with ReDriveApp. That is because those files were not accessed with the /auth/drive.file scope previously, and so are not already marked in Drive as accessible by your project. Users of your script or app will need to re-select said files that they wish to access via the Drive Picker. If they do not, you will get a "File not Found" error from Drive when trying to access those files by their Drive file ID.</li>

<li>The method <code>getAccess(email)</code> for a File (or Folder) in DriveApp returns the access level that the passed user has on that given File. DriveApp does this by comparing that user against the File's ACL in Drive, which may include group membership checks, as well as checks for membership in a Google Workspace domain/tenant. Since ReDriveApp cannot perform group or domain checks, it will throw an "inconclusive access check" exception if a File or Folder has group or domain level ACLs set on it. The one exception is if it's a domain ACL (i.e. anyone in the domain can View this file), and the domain of the passed email address exactly matches the primary Workspace domain associated with that ACL.</li>
</ol>

 

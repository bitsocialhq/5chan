package fivechan.android;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class AppUpdaterPluginTest {

    @Test
    public void initialDownload_requiresGithubHost() {
        assertTrue(
                AppUpdaterPlugin.isAllowedDownloadUrl(
                        "https://github.com/bitsocialnet/5chan/releases/download/v0.7.3/5chan.apk",
                        false,
                        false));
        assertFalse(
                AppUpdaterPlugin.isAllowedDownloadUrl(
                        "https://objects.githubusercontent.com/github-production-release-asset.apk",
                        false,
                        false));
        assertFalse(
                AppUpdaterPlugin.isAllowedDownloadUrl(
                        "https://evil.example/5chan.apk", false, false));
    }

    @Test
    public void redirectedDownload_allowsGithubContentHostsOnly() {
        assertTrue(
                AppUpdaterPlugin.isAllowedDownloadUrl(
                        "https://objects.githubusercontent.com/github-production-release-asset.apk",
                        true,
                        false));
        assertTrue(
                AppUpdaterPlugin.isAllowedDownloadUrl(
                        "https://release-assets.githubusercontent.com/file.apk", true, false));
        assertFalse(
                AppUpdaterPlugin.isAllowedDownloadUrl(
                        "https://githubusercontent.evil.example/file.apk", true, false));
        assertFalse(
                AppUpdaterPlugin.isAllowedDownloadUrl(
                        "https://evil.example/file.apk", true, false));
    }

    @Test
    public void debugDownloads_allowOnlyLocalHosts() {
        assertTrue(
                AppUpdaterPlugin.isAllowedDownloadUrl(
                        "http://10.0.2.2:56405/5chan.apk", false, true));
        assertTrue(
                AppUpdaterPlugin.isAllowedDownloadUrl(
                        "https://localhost:56405/5chan.apk", false, true));
        assertFalse(
                AppUpdaterPlugin.isAllowedDownloadUrl(
                        "http://192.168.1.8:56405/5chan.apk", false, true));
        assertFalse(
                AppUpdaterPlugin.isAllowedDownloadUrl(
                        "http://10.0.2.2:56405/5chan.apk", false, false));
    }

    @Test
    public void malformedOrUnsupportedUrls_areRejected() {
        assertFalse(AppUpdaterPlugin.isAllowedDownloadUrl(null, true, true));
        assertFalse(AppUpdaterPlugin.isAllowedDownloadUrl("not a url", true, true));
        assertFalse(
                AppUpdaterPlugin.isAllowedDownloadUrl(
                        "ftp://github.com/bitsocialnet/5chan/file.apk", true, true));
    }
}
